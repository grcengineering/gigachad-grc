import { useState, useCallback } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import {
  PlayIcon,
  DocumentDuplicateIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface ValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

interface Props {
  code: string;
  onChange: (code: string) => void;
  onValidate: (code: string) => Promise<ValidationResult>;
  onTest: () => void;
  isTestLoading?: boolean;
  testResult?: { success: boolean; message: string; data?: any };
}

const DEFAULT_TEMPLATE = `/**
 * Custom Integration Code
 * 
 * Available APIs:
 * - fetch(url, options): Make HTTP requests (same as browser fetch)
 * - console.log(...args): Log messages
 * - context.baseUrl: The configured base URL
 * - context.auth.headers: Pre-configured authentication headers
 * 
 * Return format:
 * {
 *   evidence: [
 *     {
 *       title: string,
 *       description: string,
 *       data: any,
 *       type?: string, // 'screenshot', 'document', 'log', 'config', 'report'
 *     }
 *   ]
 * }
 */

async function sync(context) {
  const { baseUrl, auth } = context;
  
  // Example: Fetch data from an API
  const response = await fetch(\`\${baseUrl}/api/data\`, {
    headers: {
      ...auth.headers,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(\`API request failed: \${response.status}\`);
  }
  
  const data = await response.json();
  
  // Return evidence to be created
  return {
    evidence: [
      {
        title: \`API Data - \${new Date().toLocaleDateString()}\`,
        description: 'Data collected from custom API',
        data: data,
        type: 'automated',
      },
    ],
  };
}

// Export the sync function
module.exports = { sync };
`;

export default function CodeEditor({
  code,
  onChange,
  onValidate,
  onTest,
  isTestLoading,
  testResult,
}: Props) {
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const handleEditorMount: OnMount = (editor, monaco) => {
    // Configure JavaScript/TypeScript language features
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });

    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      lib: ['es2020'],
    });

    // Add custom type definitions
    const customTypes = `
      interface Context {
        baseUrl: string;
        auth: {
          headers: Record<string, string>;
          token?: string;
        };
        organizationId: string;
        integrationId: string;
      }

      interface EvidenceItem {
        title: string;
        description: string;
        data: any;
        type?: 'screenshot' | 'document' | 'log' | 'config' | 'report' | 'automated';
      }

      interface SyncResult {
        evidence: EvidenceItem[];
      }

      declare function fetch(url: string, options?: RequestInit): Promise<Response>;
      declare const console: Console;
      declare const context: Context;
    `;

    monaco.languages.typescript.javascriptDefaults.addExtraLib(customTypes, 'custom.d.ts');

    // Set editor options
    editor.updateOptions({
      fontSize: 14,
      lineHeight: 22,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      tabSize: 2,
    });
  };

  const handleValidate = useCallback(async () => {
    setIsValidating(true);
    try {
      const result = await onValidate(code);
      setValidation(result);
    } catch (error: any) {
      setValidation({ valid: false, errors: [error.message] });
    } finally {
      setIsValidating(false);
    }
  }, [code, onValidate]);

  const handleReset = () => {
    onChange(DEFAULT_TEMPLATE);
    setValidation(null);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-surface-800/50 border-b border-surface-700">
        <div className="flex items-center gap-2">
          <button
            onClick={handleValidate}
            disabled={isValidating}
            className="btn-secondary text-sm flex items-center gap-1"
          >
            {isValidating ? (
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircleIcon className="w-4 h-4" />
            )}
            Validate
          </button>
          <button
            onClick={onTest}
            disabled={isTestLoading}
            className="btn-primary text-sm flex items-center gap-1"
          >
            {isTestLoading ? (
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
            ) : (
              <PlayIcon className="w-4 h-4" />
            )}
            Test Run
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="p-2 text-surface-400 hover:text-surface-200"
            title="Copy code"
          >
            <DocumentDuplicateIcon className="w-4 h-4" />
          </button>
          <button
            onClick={handleReset}
            className="p-2 text-surface-400 hover:text-surface-200"
            title="Reset to template"
          >
            <ArrowPathIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Validation/Test Results */}
      {(validation || testResult) && (
        <div className="px-4 py-2 bg-surface-800/30 border-b border-surface-700">
          {validation && (
            <div className={clsx(
              'flex items-start gap-2 text-sm',
              validation.valid ? 'text-green-400' : 'text-red-400'
            )}>
              {validation.valid ? (
                <CheckCircleIcon className="w-5 h-5 flex-shrink-0" />
              ) : (
                <XCircleIcon className="w-5 h-5 flex-shrink-0" />
              )}
              <div>
                {validation.valid ? (
                  <span>Code is valid</span>
                ) : (
                  <div>
                    {validation.errors?.map((err, i) => (
                      <div key={i}>{err}</div>
                    ))}
                  </div>
                )}
                {validation.warnings && validation.warnings.length > 0 && (
                  <div className="text-yellow-400 mt-1 flex items-start gap-1">
                    <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>
                      {validation.warnings.map((warn, i) => (
                        <div key={i}>{warn}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {testResult && (
            <div className={clsx(
              'flex items-start gap-2 text-sm mt-2',
              testResult.success ? 'text-green-400' : 'text-red-400'
            )}>
              {testResult.success ? (
                <CheckCircleIcon className="w-5 h-5 flex-shrink-0" />
              ) : (
                <XCircleIcon className="w-5 h-5 flex-shrink-0" />
              )}
              <div>
                <div>{testResult.message}</div>
                {testResult.data && (
                  <pre className="mt-2 p-2 bg-surface-900 rounded text-xs text-surface-300 overflow-auto max-h-32">
                    {JSON.stringify(testResult.data, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language="javascript"
          theme="vs-dark"
          value={code}
          onChange={(value) => onChange(value || '')}
          onMount={handleEditorMount}
          options={{
            fontSize: 14,
            lineHeight: 22,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            tabSize: 2,
            automaticLayout: true,
          }}
        />
      </div>

      {/* Help Text */}
      <div className="px-4 py-2 bg-surface-800/30 border-t border-surface-700 text-xs text-surface-500">
        <strong>Tip:</strong> The <code className="bg-surface-700 px-1 rounded">sync(context)</code> function is called when syncing.
        Return an object with an <code className="bg-surface-700 px-1 rounded">evidence</code> array containing data to save.
      </div>
    </div>
  );
}



