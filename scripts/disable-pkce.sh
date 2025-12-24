#!/bin/bash
# Enable PKCE requirement for grc-frontend client in Keycloak

echo "Getting admin token..."
TOKEN=$(curl -s -X POST "http://localhost:8080/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin" \
  -d "password=admin" \
  -d "grant_type=password" \
  -d "client_id=admin-cli" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

if [ -z "$TOKEN" ]; then
  echo "Failed to get token!"
  exit 1
fi
echo "Got token!"

echo "Getting client ID..."
CLIENT_UUID=$(curl -s "http://localhost:8080/admin/realms/gigachad-grc/clients?clientId=grc-frontend" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['id'])")

if [ -z "$CLIENT_UUID" ]; then
  echo "Failed to get client ID!"
  exit 1
fi
echo "Client UUID: $CLIENT_UUID"

echo "Updating client to enable PKCE..."
curl -s -X PUT "http://localhost:8080/admin/realms/gigachad-grc/clients/$CLIENT_UUID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"id\": \"$CLIENT_UUID\",
    \"clientId\": \"grc-frontend\",
    \"name\": \"GRC Frontend Application\",
    \"enabled\": true,
    \"publicClient\": true,
    \"standardFlowEnabled\": true,
    \"directAccessGrantsEnabled\": true,
    \"protocol\": \"openid-connect\",
    \"rootUrl\": \"http://localhost:3000\",
    \"baseUrl\": \"/\",
    \"redirectUris\": [\"http://localhost:3000/*\", \"http://localhost/*\"],
    \"webOrigins\": [\"http://localhost:3000\", \"http://localhost\", \"+\"],
    \"attributes\": {
      \"pkce.code.challenge.method\": \"S256\",
      \"post.logout.redirect.uris\": \"http://localhost:3000/*\"
    }
  }"

echo ""
echo "Done! PKCE is now enabled."
