#!/usr/bin/env bash
mkdir -p bin

INDEX="lib/index.js"

echo "copy $INDEX to bin"

ln -sf $(realpath $INDEX) bin/npmlocal
chmod +x $INDEX

chmod +x -R bin
