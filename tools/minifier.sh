if [ $# -eq 0 ]; then
  echo 'Needs a command line argument. Did you mean to run deploy?'
  echo 'running that instead'
  ./tools/deploy.sh
  exit 1
fi

in=$1.js
out=$1.min.js
map=$1.map.js

echo "--[ $in ]--"
before=`stat -c %s $out`
beforeCompress=`gzip -c $out | wc -c`

uglifyjs --source-map $map -c -m -- $in > $out

after=`stat -c %s $out`
afterCompress=`gzip -c $out | wc -c`

echo " raw: $before -> $after"
echo " gzip: $beforeCompress -> $afterCompress"
echo
