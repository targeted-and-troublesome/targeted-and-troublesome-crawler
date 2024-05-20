## Targeted and Troublesome: Tracking and Advertising on Children's Websites (IEEE S&P'24)

This repository contains the code for the paper titled [**Targeted and Troublesome: Tracking and Advertising on Children's Websites**](https://arxiv.org/pdf/2308.04887) (to be presented at the [45th IEEE Symposium on
Security and Privacy](https://sp2024.ieee-security.org/)). The paper investigates targeted and inappropriate advertising on websites targeted at children, along with online tracking.

![ad_classification](https://github.com/targeted-and-troublesome/targeted-and-troublesome-crawler/assets/5788790/74805ebd-a8c0-4bdb-b2f3-d89825574edb)

<details>
  <summary>
      <b>NSFW</b> ⚠️ Click to see a sample of improper ads found on child-directed websites in our crawls.
  </summary>

![bad_ads_collage](https://github.com/targeted-and-troublesome/targeted-and-troublesome-crawler/assets/5788790/a9183d6d-2fe3-4571-8326-5ee22037ea51)

</details>



### Crawler
We extended [Tracker Radar Collector](https://github.com/duckduckgo/tracker-radar-collector) from DuckDuckGo to scrape ads, detect fingerprinting attempts and capture a video recording of the screen.

Our main modifications can be found in the following files:
- [`AdCollector.js`](https://github.com/targeted-and-troublesome/targeted-and-troublesome-crawler/blob/main/collectors/AdCollector.js): detects ads and scrapes ad
disclosures. AdCollector is partly based on the [adscraper](https://github.com/UWCSESecurityLab/adscraper) library of the [UW CSE Security Lab](https://seclab.cs.washington.edu/).
- [`FingerprintCollector.js`](https://github.com/targeted-and-troublesome/targeted-and-troublesome-crawler/blob/main/collectors/FingerprintCollector.js) and [`fingerprintDetection.js`](https://github.com/targeted-and-troublesome/targeted-and-troublesome-crawler/blob/main/helpers/fingerprintDetection.js): detects fingerprinting related function calls and property accesses.
- [`LinkCollector.js`](https://github.com/targeted-and-troublesome/targeted-and-troublesome-crawler/blob/main/collectors/LinkCollector.js): extracts inner page links.
- [`VideoCollector.js`](https://github.com/targeted-and-troublesome/targeted-and-troublesome-crawler/blob/main/collectors/VideoCollector.js): captures the crawl video.

#### Getting Started
1. Clone this repo.
2. Install the required npm packages (`npm i`).
3. Run one of the following commands for a single URL or a URL list:

**For a single URL:**

```npm run crawl -- -u 'https://games2jolly.com/' -o ./data/ -v -f -d "fingerprints,requests,cookies,ads,screenshots,cmps,videos" --reporters 'cli,file' -l ./data/ --autoconsent-action "optIn"```

**For a list of URLs:**

```npm run crawl -- -u urls/fra_desktop_home_inner_combined.csv -o ./data/ -v -f -d "fingerprints,requests,cookies,ads,screenshots,cmps,videos" --reporters 'cli,file' -l ./data/ --autoconsent-action "optIn"```

#### Crawl scripts

The [`shell_scripts/ad-scraper folder`](https://github.com/targeted-and-troublesome/targeted-and-troublesome-crawler/blob/main/shell_scripts/ad-scraper) contains the scripts used to crawl the child-directed sites as part of this study.
All URLs, including both landing and inner pages, associated with the child-directed sites, are available within [`this folder`](https://github.com/targeted-and-troublesome/targeted-and-troublesome-crawler/blob/main/urls).

Please check the upstream [Tracker Radar Collector repository](https://github.com/duckduckgo/tracker-radar-collector/) for other command line options.

### Webpage Classifier
We built a lightweight multilingual classifier to identify websites directed at children based on their title and description. Specifically, we fine-tuned the distilled, multilingual `sentence-transformers/paraphrase-multilingual-mpnet-base-v2` model from the [`SentenceTransformer`](https://sbert.net/) library using a combination of existing list of children's websites and manually labeled training data. The code for fine-tuning and inference (webpage classification) can be found in the [`classifier`](https://github.com/targeted-and-troublesome/targeted-and-troublesome-crawler/tree/main/classifier) directory.

A high-level overview of the classification pipeline is shown below. For more details, please refer to the Section 3 of the paper.

![Screenshot 2024-05-20 at 14 22 16](https://github.com/targeted-and-troublesome/targeted-and-troublesome-crawler/assets/44579458/aafff9f0-51ae-44d4-b4b3-cceb13e97347)



### Reference
```
@inproceedings {,
    author = {Zahra Moti and Asuman Senol and Hamid Bostani and Frederik Zuiderveen Borgesius and Veelasha Moonsamy and Arunesh Mathur and Gunes Acar},
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
