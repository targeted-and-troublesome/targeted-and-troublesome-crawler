set -x  # uncomment to debug
# Usage:
#   sample_crawl_command.sh

COLLECTORS="fingerprints,requests,cookies,ads,screenshots,cmps,videos"

OUTDIR='nyc_accept_all_mobile'

echo "Output dir: ${OUTDIR}"

mkdir -p $OUTDIR

echo_date(){
  date -u +"%Y-%m-%dT%H:%M:%S.%3NZ"
}

npm run crawl -- -i urls/nyc_mobile_home_inner_combined.csv -o $OUTDIR -v -f -d $COLLECTORS --reporters 'cli,file' -l $OUTDIR --autoconsent-action "optIn" -c 6 -m --chromium-version 1109227

