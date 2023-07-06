#!/bin/bash

# Detect OS
os_type="$(uname -s)"
case "${os_type}" in
    Linux*)     dir_path=~/.config/google-chrome/;;
    Darwin*)    dir_path=~/Library/Application\ Support/Google/Chrome/;;
    CYGWIN*)    dir_path="/cygdrive/c/Users/$(whoami)/AppData/Local/Google/Chrome/User Data/";;
    MINGW*)     dir_path="/c/Users/$(whoami)/AppData/Local/Google/Chrome/User Data/";;
    *)          echo "Unknown OS: $os_type"; exit 1;;
esac

# Print the paths of Google Chrome user profile directories to console
for dir in "${dir_path}"*; do
    if [[ -d "$dir" ]]; then
        echo "$dir"
    fi
done
