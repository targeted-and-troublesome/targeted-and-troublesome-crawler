## Targeted and Troublesome: Tracking and Advertising on Children's Websites (S&P'24)

This repository contains the code for the paper titled [_Targeted and Troublesome: Tracking and Advertising on Children's Websites_](https://arxiv.org/abs/2308.04887) (to be presented at [IEEE S&P'24](https://sp2024.ieee-security.org/)).

**Background:** Trackers and advertisers frequently exploit users' online behavior without consent, including on websites targeting children. However, research in this area remains limited. To address this gap, we conduct an examination of tracking and advertising practices on such websites. Leveraging a multilingual classifier we developed and a dataset comprising over two million web pages, we identify two thousand child-directed websites and assess the prevalence of trackers, fingerprinting scripts, and advertisements. Our findings indicate that roughly 90% of these websites employ tracking mechanisms, and about 27% display targeted advertisements, underscoring the need for parental consent. Additionally, we employ a machine learning pipeline to uncover inappropriate ads promoting dating, weight loss, mental health services, and explicit content, highlighting the necessity for more stringent regulatory measures to protect children online.

### Crawler
We extended DuckDuckGo’s [Tracker Radar Collector](https://github.com/duckduckgo/tracker-radar-collector) to record HTTP requests/responses, cookies,
screenshots, and JavaScript API calls. Our main modifications can be found in the following files:
- [`AdCollector.js`](https://github.com/asumansenol/targeted-and-troublesome-crawler/blob/main/collectors/AdCollector.js): detects ads and scrapes ad
disclosures.
- [`FingerprintCollector.js`](https://github.com/asumansenol/targeted-and-troublesome-crawler/blob/main/collectors/FingerprintCollector.js): detects fingerprinting related function calls and property accesses.
- [`fingerprintDetection.js`](https://github.com/asumansenol/targeted-and-troublesome-crawler/blob/main/helpers/fingerprintDetection.js): instrumentation for fingerprinting detection.
- [`LinkCollector.js`](https://github.com/asumansenol/targeted-and-troublesome-crawler/blob/main/collectors/LinkCollector.js): extracts inner page links.
- [`VideoCollector.js`](https://github.com/asumansenol/targeted-and-troublesome-crawler/blob/main/collectors/VideoCollector.js): captures the crawl video.

To start a crawl, 1) clone this repo, 2) install the required npm packages (`npm i`) and 3) run the following command for a given URL or a URL list:

- for a given URL: 

```npm run crawl -- -u 'https://games2jolly.com/' -o ./data/ -v -f -d "fingerprints,requests,cookies,ads,screenshots,cmps,videos" --reporters 'cli,file' -l ./data/ --autoconsent-action "optIn"```

- for a URL list: 

```npm run crawl -- -u urls/fra_desktop_home_inner_combined.csv -o ./data/ -v -f -d "fingerprints,requests,cookies,ads,screenshots,cmps,videos" --reporters 'cli,file' -l ./data/ --autoconsent-action "optIn"```

The [`shell_scripts/ad-scraper folder`](https://github.com/asumansenol/targeted-and-troublesome-crawler/blob/main/shell_scripts/ad-scraper) contains the commands used to crawl the child-directed sites as part of this study.
All URLs, including both landing and inner pages, associated with the child-directed sites, are available within [`this folder`](https://github.com/asumansenol/targeted-and-troublesome-crawler/blob/main/urls).

Please check the upstream [Tracker Radar Collector repository](https://github.com/duckduckgo/tracker-radar-collector/) for other command line options.

### Reference
```
@article{
    author    = {Z. Moti, A. Senol, H. Bostani, F. Borgesius, V. Moonsamy, A. Mathur, and G. Acar},
    title     = {{Targeted and Troublesome: Tracking and Advertising on Children's Websites}},
    booktitle = {IEEE Security and Privacy},
    year      = 2024,
    month     = May
}
```
