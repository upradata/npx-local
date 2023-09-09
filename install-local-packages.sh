#!/usr/bin/env bash

shopt -s expand_aliases
source ~/.bash_aliases

for pkg in util node-util dependency-injection; do
    (
        node_module_pkg="./node_modules/@upradata/$pkg"
        pkg_dir="$HOME/Libraries/Upra-Data/$pkg"

        mkdir -p "$node_module_pkg"
        cd "$node_module_pkg"

        ln -fs "$pkg_dir/package.json" .
        ln -fs "$pkg_dir/lib" .
        ln -fs "$pkg_dir/lib-esm" .
        ln -fs "$pkg_dir/node_modules" .

        printf-color "$pkg" success
        echo " installed!"
    )
done
