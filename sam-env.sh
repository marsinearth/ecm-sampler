#!/bin/bash

load_sam_parameter_overrides() {
    local env_file="${1:-.env}"

    if [ ! -f "$env_file" ]; then
        echo "Error: $env_file file not found!"
        return 1
    fi

    OVERRIDES=()

    while IFS= read -r line || [ -n "$line" ]; do
        [[ "$line" =~ ^[[:space:]]*#.*$ ]] && continue
        [[ -z "$line" ]] && continue
        [[ "$line" != *=* ]] && continue

        local snake_key="${line%%=*}"
        local val="${line#*=}"
        local camel_key

        snake_key="${snake_key%$'\r'}"
        val="${val%$'\r'}"

        export "$snake_key=$val"

        camel_key=$(echo "$snake_key" | tr '[:upper:]' '[:lower:]' | awk -F_ '{for(i=1;i<=NF;i++) printf "%s", toupper(substr($i,1,1)) substr($i,2); print ""}')
        OVERRIDES+=("$camel_key=$val")
    done < "$env_file"
}

generate_sam_config_with_parameter_overrides() {
    local script_dir="${1:-.}"
    local base_config_file="$script_dir/samconfig.toml"
    local output_file="$script_dir/.samconfig-env.yaml"

    python3 - "$base_config_file" "$output_file" "${OVERRIDES[@]}" <<'PY'
import pathlib
import sys


def parse_scalar(raw):
    value = raw.strip()
    if value.startswith('"') and value.endswith('"'):
        return value[1:-1].replace('\\"', '"').replace("\\\\", "\\")
    if value in ("true", "false"):
        return value == "true"
    try:
        return int(value)
    except ValueError:
        pass
    try:
        return float(value)
    except ValueError:
        return value


def parse_simple_toml(path):
    data = {}
    current = data

    if not path.exists():
        return data

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue

        if line.startswith("[") and line.endswith("]"):
            current = data
            for part in line[1:-1].split("."):
                current = current.setdefault(part, {})
            continue

        if "=" not in line:
            continue

        key, value = line.split("=", 1)
        current[key.strip()] = parse_scalar(value)

    return data


def yaml_scalar(value):
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return str(value)

    text = str(value).replace("'", "''")
    return f"'{text}'"


def dump_yaml(value, indent=0):
    lines = []
    prefix = "  " * indent

    if isinstance(value, dict):
        for key, item in value.items():
            if isinstance(item, (dict, list)):
                lines.append(f"{prefix}{key}:")
                lines.extend(dump_yaml(item, indent + 1))
            else:
                lines.append(f"{prefix}{key}: {yaml_scalar(item)}")
    elif isinstance(value, list):
        for item in value:
            if isinstance(item, (dict, list)):
                lines.append(f"{prefix}-")
                lines.extend(dump_yaml(item, indent + 1))
            else:
                lines.append(f"{prefix}- {yaml_scalar(item)}")

    return lines


base_config = pathlib.Path(sys.argv[1])
output_path = pathlib.Path(sys.argv[2])
overrides = sys.argv[3:]

config = parse_simple_toml(base_config)
config.setdefault("version", 0.1)

default_env = config.setdefault("default", {})
for command_name in ("build", "deploy"):
    parameters = default_env.setdefault(command_name, {}).setdefault("parameters", {})
    parameters["parameter_overrides"] = overrides

output_path.write_text("\n".join(dump_yaml(config)) + "\n", encoding="utf-8")
print(output_path.name)
PY
}
