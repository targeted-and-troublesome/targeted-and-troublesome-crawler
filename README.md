## Targeted and Troublesome: Tracking and Advertising on Children's Websites (IEEE S&P'24)

This repository contains the code for the paper titled [_Targeted and Troublesome: Tracking and Advertising on Children's Websites_](https://arxiv.org/abs/2308.04887) (to be presented at [IEEE S&P'24](https://sp2024.ieee-security.org/)). The paper investigates the prevalence of tracking and advertising on websites targeted at children.

### Background
Trackers and advertisers often exploit user behavior online without consent, a practice that extends even to websites targeted at children. Despite the critical nature of this issue, research has been sparse. To bridge this gap, we conducted a thorough investigation into the tracking and advertising practices on child-directed websites. Utilizing a multilingual classifier and analyzing a dataset of over two million web pages, we identified two thousand websites targeted at children. Our analysis revealed that approximately 90% of these sites use tracking mechanisms, and around 27% display targeted advertisements-a practice that should require verifiable parental consent. Furthermore, we implemented a machine learning pipeline to detect inappropriate advertisements related to dating, weight loss, mental health services, and explicit content. We found ads that promote services related to dating, weight loss, and mental health; as well as ads for sex toys and flirting chat services. Some of these ads feature repulsive, sexually explicit, and highly inappropriate imagery. Please refer to our paper for a comprehensive overview.


https://github.com/targeted-and-troublesome/targeted-and-troublesome-crawler/assets/44579458/5366eed3-4ef3-4770-9fc0-ede6bf05ae74


### Crawler
We extended [Tracker Radar Collector](https://github.com/duckduckgo/tracker-radar-collector) from DuckDuckGo. Our enhancements capture HTTP requests/responses, cookies,
screenshots, and JavaScript API calls. Our main modifications can be found in the following files:
- [`AdCollector.js`](https://github.com/asumansenol/targeted-and-troublesome-crawler/blob/main/collectors/AdCollector.js): detects ads and scrapes ad
disclosures. During the development of AdCollector, we benefited from the [adscraper](https://github.com/UWCSESecurityLab/adscraper) tool.
- [`FingerprintCollector.js`](https://github.com/asumansenol/targeted-and-troublesome-crawler/blob/main/collectors/FingerprintCollector.js): detects fingerprinting related function calls and property accesses.
- [`fingerprintDetection.js`](https://github.com/asumansenol/targeted-and-troublesome-crawler/blob/main/helpers/fingerprintDetection.js): instrumentation for fingerprinting detection.
- [`LinkCollector.js`](https://github.com/asumansenol/targeted-and-troublesome-crawler/blob/main/collectors/LinkCollector.js): extracts inner page links.
- [`VideoCollector.js`](https://github.com/asumansenol/targeted-and-troublesome-crawler/blob/main/collectors/VideoCollector.js): captures the crawl video.

#### Getting Started 
1. clone this repo.
2. install the required npm packages (`npm i`).
3. run the following command for a given URL or a URL list:

**For a single URL:** 

```npm run crawl -- -u 'https://games2jolly.com/' -o ./data/ -v -f -d "fingerprints,requests,cookies,ads,screenshots,cmps,videos" --reporters 'cli,file' -l ./data/ --autoconsent-action "optIn"```

**For a list of URLs:** 

```npm run crawl -- -u urls/fra_desktop_home_inner_combined.csv -o ./data/ -v -f -d "fingerprints,requests,cookies,ads,screenshots,cmps,videos" --reporters 'cli,file' -l ./data/ --autoconsent-action "optIn"```

The [`shell_scripts/ad-scraper folder`](https://github.com/asumansenol/targeted-and-troublesome-crawler/blob/main/shell_scripts/ad-scraper) contains the commands used to crawl the child-directed sites as part of this study.
All URLs, including both landing and inner pages, associated with the child-directed sites, are available within [`this folder`](https://github.com/asumansenol/targeted-and-troublesome-crawler/blob/main/urls).

Please check the upstream [Tracker Radar Collector repository](https://github.com/duckduckgo/tracker-radar-collector/) for other command line options.

### Classifier
We built a multilingual classifier to identify websites directed at children based on their title and description. We utilized a pre-trained and multilingual langualge model from [`SentenceTransformer`](https://sbert.net/), fine-tuning it for this task. 

A high-level overview of the classification pipeline is shown below:

![Screenshot 2024-05-20 at 14 22 16](https://github.com/targeted-and-troublesome/targeted-and-troublesome-crawler/assets/44579458/aafff9f0-51ae-44d4-b4b3-cceb13e97347)

For more details, please refer to the Section 3 of the paper.

The code and resources for this classifier can be found in the [`classifier`](https://github.com/targeted-and-troublesome/targeted-and-troublesome-crawler/tree/main/classifier) directory of this repository. 

### Reference
```
@INPROCEEDINGS {,
author = {Z. Moti and A. Senol and H. Bostani and F. Zuiderveen Borgesius and V. Moonsamy and A. Mathur and G. Acar},
booktitle = {2024 IEEE Symposium on Security and Privacy (SP)},
title = {Targeted and Troublesome: Tracking and Advertising on Children’s Websites},
year = {2024},
volume = {},
issn = {2375-1207},
pages = {118-118},
doi = {10.1109/SP54263.2024.00118},
url = {https://doi.ieeecomputersociety.org/10.1109/SP54263.2024.00118},
publisher = {IEEE Computer Society},
address = {Los Alamitos, CA, USA},
month = {may}
}
```
