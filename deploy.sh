#!/bin/bash

for file in db db-helper; do
  cp src/$file.js $file.js
done

echo "DB.__version__='`git describe`';" >> $file.js

for file in db db-helper; do
  ./minifier.sh $file
done

