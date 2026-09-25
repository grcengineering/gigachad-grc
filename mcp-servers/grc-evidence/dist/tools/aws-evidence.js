import { S3Client, ListBucketsCommand, GetBucketPolicyCommand, GetBucketEncryptionCommand, GetPublicAccessBlockCommand, } from '@aws-sdk/client-s3';
import { IAMClient, ListUsersCommand, ListPoliciesCommand, GetAccountPasswordPolicyCommand, ListMFADevicesCommand, } from '@aws-sdk/client-iam';
import { EC2Client, DescribeSecurityGroupsCommand, DescribeVpcsCommand, DescribeSubnetsCommand, } from '@aws-sdk/client-ec2';
import { ConfigServiceClient, DescribeConfigRulesCommand, GetComplianceDetailsByConfigRuleCommand, } from '@aws-sdk/client-config-service';
export async function collectAWSEvidence(params) {
    const { services, region = 'us-east-1', includeConfigurations = true } = params;
    const results = [];
    for (const service of services) {
        try {
            let evidence;
            switch (service.toLowerCase()) {
                case 's3':
                    evidence = await collectS3Evidence(region, includeConfigurations);
                    break;
                case 'iam':
                    evidence = await collectIAMEvidence(region);
                    break;
                case 'ec2':
                case 'vpc':
                    evidence = await collectEC2Evidence(region);
                    break;
                case 'config':
                    evidence = await collectConfigEvidence(region);
                    break;
                default:
                    throw new Error(`Unsupported AWS service: ${service}`);
            }
            results.push(evidence);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`AWS ${service} evidence collection failed: ${message}`);
        }
    }
    return results;
}
async function collectS3Evidence(region, includeConfigurations) {
    const client = new S3Client({ region });
    const findings = [];
    let compliantCount = 0;
    let nonCompliantCount = 0;
    try {
        const bucketsResponse = await client.send(new ListBucketsCommand({}));
        const buckets = bucketsResponse.Buckets || [];
        for (const bucket of buckets) {
            const bucketName = bucket.Name;
            if (!bucketName)
                continue;
            const bucketFindings = {
                bucketName,
                creationDate: bucket.CreationDate,
            };
            if (includeConfigurations) {
                // Check encryption
                try {
                    const encryption = await client.send(new GetBucketEncryptionCommand({ Bucket: bucketName }));
                    bucketFindings.encryption = {
                        enabled: true,
                        rules: encryption.ServerSideEncryptionConfiguration?.Rules,
                    };
                    compliantCount++;
                }
                catch {
                    bucketFindings.encryption = { enabled: false };
                    nonCompliantCount++;
                }
                // Check public access block
                try {
                    const publicAccess = await client.send(new GetPublicAccessBlockCommand({ Bucket: bucketName }));
                    bucketFindings.publicAccessBlock = publicAccess.PublicAccessBlockConfiguration;
                    if (publicAccess.PublicAccessBlockConfiguration?.BlockPublicAcls &&
                        publicAccess.PublicAccessBlockConfiguration?.BlockPublicPolicy) {
                        compliantCount++;
                    }
                    else {
                        nonCompliantCount++;
                    }
                }
                catch {
                    bucketFindings.publicAccessBlock = null;
                    nonCompliantCount++;
                }
                // Check bucket policy
                try {
                    const policy = await client.send(new GetBucketPolicyCommand({ Bucket: bucketName }));
                    bucketFindings.hasPolicy = !!policy.Policy;
                    bucketFindings.policy = policy.Policy ? JSON.parse(policy.Policy) : null;
                }
                catch {
                    bucketFindings.hasPolicy = false;
                }
            }
            findings.push(bucketFindings);
        }
        return {
            service: 's3',
            collectedAt: new Date().toISOString(),
            region,
            findings,
            summary: {
                totalResources: buckets.length,
                compliantResources: compliantCount,
                nonCompliantResources: nonCompliantCount,
            },
        };
    }
    catch (error) {
        throw new Error(`Failed to collect S3 evidence: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
async function collectIAMEvidence(region) {
    const client = new IAMClient({ region });
    const findings = [];
    let compliantCount = 0;
    let nonCompliantCount = 0;
    try {
        // Get password policy
        try {
            const passwordPolicy = await client.send(new GetAccountPasswordPolicyCommand({}));
            const policy = passwordPolicy.PasswordPolicy;
            findings.push({
                type: 'password_policy',
                policy,
                compliance: {
                    minLength: (policy?.MinimumPasswordLength || 0) >= 14,
                    requireUppercase: policy?.RequireUppercaseCharacters || false,
                    requireLowercase: policy?.RequireLowercaseCharacters || false,
                    requireNumbers: policy?.RequireNumbers || false,
                    requireSymbols: policy?.RequireSymbols || false,
                    maxAge: (policy?.MaxPasswordAge || 0) <= 90,
                },
            });
            if ((policy?.MinimumPasswordLength || 0) >= 14 &&
                policy?.RequireUppercaseCharacters &&
                policy?.RequireLowercaseCharacters &&
                policy?.RequireNumbers &&
                policy?.RequireSymbols) {
                compliantCount++;
            }
            else {
                nonCompliantCount++;
            }
        }
        catch {
            findings.push({ type: 'password_policy', error: 'No password policy configured' });
            nonCompliantCount++;
        }
        // Get users and check MFA
        const usersResponse = await client.send(new ListUsersCommand({}));
        const users = usersResponse.Users || [];
        for (const user of users) {
            const userName = user.UserName;
            if (!userName)
                continue;
            const mfaResponse = await client.send(new ListMFADevicesCommand({ UserName: userName }));
            const hasMFA = (mfaResponse.MFADevices?.length || 0) > 0;
            findings.push({
                type: 'user',
                userName,
                createDate: user.CreateDate,
                passwordLastUsed: user.PasswordLastUsed,
                hasMFA,
            });
            if (hasMFA) {
                compliantCount++;
            }
            else {
                nonCompliantCount++;
            }
        }
        // Get policies
        const policiesResponse = await client.send(new ListPoliciesCommand({ Scope: 'Local' }));
        findings.push({
            type: 'custom_policies',
            count: policiesResponse.Policies?.length || 0,
            policies: policiesResponse.Policies?.map((p) => ({
                name: p.PolicyName,
                arn: p.Arn,
                attachmentCount: p.AttachmentCount,
            })),
        });
        return {
            service: 'iam',
            collectedAt: new Date().toISOString(),
            region,
            findings,
            summary: {
                totalResources: users.length + 1, // +1 for password policy
                compliantResources: compliantCount,
                nonCompliantResources: nonCompliantCount,
            },
        };
    }
    catch (error) {
        throw new Error(`Failed to collect IAM evidence: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
async function collectEC2Evidence(region) {
    const client = new EC2Client({ region });
    const findings = [];
    let compliantCount = 0;
    let nonCompliantCount = 0;
    try {
        // Get VPCs
        const vpcsResponse = await client.send(new DescribeVpcsCommand({}));
        const vpcs = vpcsResponse.Vpcs || [];
        for (const vpc of vpcs) {
            findings.push({
                type: 'vpc',
                vpcId: vpc.VpcId,
                cidrBlock: vpc.CidrBlock,
                isDefault: vpc.IsDefault,
                state: vpc.State,
                tags: vpc.Tags,
            });
        }
        // Get Subnets
        const subnetsResponse = await client.send(new DescribeSubnetsCommand({}));
        const subnets = subnetsResponse.Subnets || [];
        for (const subnet of subnets) {
            findings.push({
                type: 'subnet',
                subnetId: subnet.SubnetId,
                vpcId: subnet.VpcId,
                cidrBlock: subnet.CidrBlock,
                availabilityZone: subnet.AvailabilityZone,
                mapPublicIpOnLaunch: subnet.MapPublicIpOnLaunch,
            });
            if (subnet.MapPublicIpOnLaunch) {
                nonCompliantCount++;
            }
            else {
                compliantCount++;
            }
        }
        // Get Security Groups
        const sgResponse = await client.send(new DescribeSecurityGroupsCommand({}));
        const securityGroups = sgResponse.SecurityGroups || [];
        for (const sg of securityGroups) {
            const hasOpenSSH = sg.IpPermissions?.some((p) => p.FromPort === 22 && p.IpRanges?.some((r) => r.CidrIp === '0.0.0.0/0'));
            const hasOpenRDP = sg.IpPermissions?.some((p) => p.FromPort === 3389 && p.IpRanges?.some((r) => r.CidrIp === '0.0.0.0/0'));
            findings.push({
                type: 'security_group',
                groupId: sg.GroupId,
                groupName: sg.GroupName,
                vpcId: sg.VpcId,
                description: sg.Description,
                ingressRules: sg.IpPermissions?.length || 0,
                egressRules: sg.IpPermissionsEgress?.length || 0,
                compliance: {
                    hasOpenSSH,
                    hasOpenRDP,
                },
            });
            if (hasOpenSSH || hasOpenRDP) {
                nonCompliantCount++;
            }
            else {
                compliantCount++;
            }
        }
        return {
            service: 'ec2/vpc',
            collectedAt: new Date().toISOString(),
            region,
            findings,
            summary: {
                totalResources: vpcs.length + subnets.length + securityGroups.length,
                compliantResources: compliantCount,
                nonCompliantResources: nonCompliantCount,
            },
        };
    }
    catch (error) {
        throw new Error(`Failed to collect EC2/VPC evidence: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
async function collectConfigEvidence(region) {
    const client = new ConfigServiceClient({ region });
    const findings = [];
    let compliantCount = 0;
    let nonCompliantCount = 0;
    try {
        // Get Config Rules
        const rulesResponse = await client.send(new DescribeConfigRulesCommand({}));
        const rules = rulesResponse.ConfigRules || [];
        for (const rule of rules) {
            const ruleName = rule.ConfigRuleName;
            if (!ruleName)
                continue;
            // Get compliance for each rule
            const complianceResponse = await client.send(new GetComplianceDetailsByConfigRuleCommand({
                ConfigRuleName: ruleName,
                ComplianceTypes: ['NON_COMPLIANT', 'COMPLIANT'],
            }));
            const compliant = complianceResponse.EvaluationResults?.filter((r) => r.ComplianceType === 'COMPLIANT')
                .length || 0;
            const nonCompliant = complianceResponse.EvaluationResults?.filter((r) => r.ComplianceType === 'NON_COMPLIANT')
                .length || 0;
            findings.push({
                type: 'config_rule',
                ruleName,
                description: rule.Description,
                source: rule.Source?.Owner,
                complianceType: rule.ConfigRuleState,
                evaluations: {
                    compliant,
                    nonCompliant,
                },
            });
            compliantCount += compliant;
            nonCompliantCount += nonCompliant;
        }
        return {
            service: 'config',
            collectedAt: new Date().toISOString(),
            region,
            findings,
            summary: {
                totalResources: compliantCount + nonCompliantCount,
                compliantResources: compliantCount,
                nonCompliantResources: nonCompliantCount,
            },
        };
    }
    catch (error) {
        throw new Error(`Failed to collect AWS Config evidence: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
//# sourceMappingURL=aws-evidence.js.map