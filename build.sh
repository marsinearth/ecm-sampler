#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

# shellcheck source=./sam-env.sh
source "$SCRIPT_DIR/sam-env.sh"

load_sam_parameter_overrides "$SCRIPT_DIR/.env" || exit 1
CONFIG_FILE="$(generate_sam_config_with_parameter_overrides "$SCRIPT_DIR")" || exit 1

echo "🏗️ Building AWS SAM application with automated CamelCase parameter mapping..."
sam build --config-file "$CONFIG_FILE" "$@"
