#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

# shellcheck source=./sam-env.sh
source "$SCRIPT_DIR/sam-env.sh"

load_sam_parameter_overrides "$SCRIPT_DIR/.env" || exit 1
CONFIG_FILE="$(generate_sam_config_with_parameter_overrides "$SCRIPT_DIR")" || exit 1
BUILT_TEMPLATE="$SCRIPT_DIR/.aws-sam/build/template.yaml"
DEPLOY_CONFIG_FILE="../../$CONFIG_FILE"

echo "🚀 Deploying to AWS SAM with automated CamelCase parameter mapping..."
sam build --config-file "$CONFIG_FILE" || exit 1
sam deploy --template-file "$BUILT_TEMPLATE" --config-file "$DEPLOY_CONFIG_FILE" "$@"
