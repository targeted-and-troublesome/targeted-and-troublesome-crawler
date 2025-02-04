## Targeted and Troublesome: Tracking and Advertising on Children's Websites (IEEE S&P'24)

This repository contains the code for the paper titled [**Targeted and Troublesome: Tracking and Advertising on Children's Websites**](https://arxiv.org/pdf/2308.04887) (published at the [45th IEEE Symposium on
Security and Privacy](https://sp2024.ieee-security.org/)). The paper investigates targeted and inappropriate advertising on websites targeted at children, along with online tracking.

![ad_classification](https://github.com/targeted-and-troublesome/targeted-and-troublesome-crawler/assets/5788790/74805ebd-a8c0-4bdb-b2f3-d89825574edb)

<details>
  <summary>
      <b>NSFW</b> ⚠️ Click to see a sample of improper ads found on child-directed websites in our crawls.
  </summary>

![bad_ads_collage](https://github.com/targeted-and-troublesome/targeted-and-troublesome-crawler/assets/5788790/a9183d6d-2fe3-4571-8326-5ee22037ea51)

</details>


### Data release
The data from seven web crawls conducted in April 2023 is available for download from this [link](https://data.ru.nl/collections/ru/icis/sp24-child-ads_dsc_554).

### Crawler
We extended [Tracker Radar Collector](https://github.com/duckduckgo/tracker-radar-collector) from DuckDuckGo to scrape ads, detect fingerprinting attempts and capture a video recording of the screen.

Our main modifications can be found in the following files:
- [`AdCollector.js`](https://github.com/targeted-and-troublesome/targeted-and-troublesome-crawler/blob/main/collectors/AdCollector.js): detects ads and scrapes ad
disclosures. AdCollector's ad detection and scraping code is partly based on [adscraper](https://github.com/UWCSESecurityLab/adscraper) ([UW CSE Security Lab](https://seclab.cs.washington.edu/)).
- [`FingerprintCollector.js`](https://github.com/targeted-and-troublesome/targeted-and-troublesome-crawler/blob/main/collectors/FingerprintCollector.js) and [`fingerprintDetection.js`](https://github.com/targeted-and-troublesome/targeted-and-troublesome-crawler/blob/main/helpers/fingerprintDetection.js): detect fingerprinting related function calls and property accesses.
- [`LinkCollector.js`](https://github.com/targeted-and-troublesome/targeted-and-troublesome-crawler/blob/main/collectors/LinkCollector.js): extracts inner page links.
- [`VideoCollector.js`](https://github.com/targeted-and-troublesome/targeted-and-troublesome-crawler/blob/main/collectors/VideoCollector.js): captures the crawl video.

#### Crawler - Getting Started
### Installation
1. Clone this repo:
    ```sh
    git clone https://github.com/targeted-and-troublesome/targeted-and-troublesome-crawler.git
    cd targeted-and-troublesome-crawler
    ```
2. Install the required npm packages:
    ```sh
    npm install
    ```

### Running the Crawler

For a single URL:

```sh
  npm run crawl -- -u 'https://games2jolly.com' \
      -o ./data/ -v -f \
      -d "fingerprints,requests,cookies,ads,screenshots,cmps,videos" \
      --reporters 'cli,file' \
      -l ./data/ \
      --autoconsent-action "optIn"
```


For a list of URLs:

```sh
  npm run crawl -- -u urls/fra_desktop_home_inner_combined.csv \
      -o ./data/ -v -f \
      -d "fingerprints,requests,cookies,ads,screenshots,cmps,videos" \
      --reporters 'cli,file' \
      -l ./data/ \
      --autoconsent-action "optIn"
```

Please check the upstream [Tracker Radar Collector repository](https://github.com/duckduckgo/tracker-radar-collector/)
repo for explanations of the command line options.

#### Crawl scripts and webpage lists
The shell script we used to start the crawls can be found in the
[`shell_scripts/ad-scraper folder`](https://github.com/targeted-and-troublesome/targeted-and-troublesome-crawler/blob/main/shell_scripts/ad-scraper).

You can find all crawled URLs, including landing and inner page URLs associated with the child-directed sites,
in the [`URLs directory`](https://github.com/targeted-and-troublesome/targeted-and-troublesome-crawler/blob/main/urls).

### Webpage classifier

Refer to the [`inference.ipynb`](https://github.com/targeted-and-troublesome/targeted-and-troublesome-crawler/blob/main/classifier/inference.ipynb)
notebook for downloading and using the fine-tuned model that detects child-directed webpages by
page titles and descriptions. More details about the classification pipeline can be found in the [`classifier`](https://github.com/targeted-and-troublesome/targeted-and-troublesome-crawler/tree/main/classifier) directory.


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

### Contact

For any questions, suggestions, or issues regarding this project or our paper, please contact:

| **Author**         | **Email**                     |
|--------------------|-------------------------------|
| [Zahra Moti](https://www.ru.nl/en/people/moti-jeshveghani-z)      | zahra.moti@ru.nl   |
| [Asuman Senol](https://www.asumansenol.com/)    | asuman.senol@esat.kuleuven.be   |
| [Gunes Acar](https://gunesacar.net/)     | g.acar@cs.ru.nl   |
| [Hamid Bostani](https://www.ru.nl/en/people/bostani-h) | hamid.bostani@ru.nl |
| [Frederik Zuiderveen Borgesius](https://www.ru.nl/personen/zuiderveen-borgesius-f) | frederikzb@cs.ru.nl|
| [Veelasha Moonsamy](https://veelasha.org/) | veelasha.moonsamy@ruhr-uni-bochum.de |
| [Arunesh Mathur](https://aruneshmathur.co.in/) | aruneshmathur1990@gmail.com |


You can also reach out to us by opening an issue on [our GitHub repository](https://github.com/targeted-and-troublesome/targeted-and-troublesome-crawler/issues).
