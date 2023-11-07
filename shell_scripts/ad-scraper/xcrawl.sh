set -x  # uncomment to debug
# Usage:
#   sample_crawl_command.sh

COLLECTORS="fingerprints,requests,cookies,ads,screenshots,cmps,videos"

OUTDIR='TEMP_OUT'

echo "Output dir: ${OUTDIR}"

rm -rf $OUTDIR
mkdir -p $OUTDIR

// -u for urls or -i for files
MODE=$1
if [ $MODE != "-i" ] && [ $MODE != "-u" ]; then
  echo "Invalid mode. Use -i or -u"
  exit 1
fi

URL=$2

echo_date(){
  date -u +"%Y-%m-%dT%H:%M:%S.%3NZ"
}
CHROMIUM_VERSION="1109227"

npm run crawl -- $1 $2 -o $OUTDIR -v -f -d $COLLECTORS --reporters 'cli,file' -l $OUTDIR --autoconsent-action "optIn" --chromium-version $CHROMIUM_VERSION



# node cli/crawl-cli.js -u www.puzzlegame.com  -o ./data100v6 -v -f -d "fingerprints,requests,cookies,ads,screenshots,cmps,videos" --reporters 'cli,file' -l ./data100v6  --autoconsent-action "optIn"  --chromium-version 1109227
