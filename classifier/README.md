# Multilingual Text Classifier for Children's Websites

This README provides resources for fine-tuning and evaluating a multilingual classifier to identify children's websites using their titles and descriptions.

- [`fine-tuning.ipynb`](https://github.com/targeted-and-troublesome/targeted-and-troublesome-crawler/blob/main/classifier/fine-tuning.ipynb): Demonstrates fine-tuning the  [`sentence-transformers/paraphrase-multilingual-mpnet-base-v2`](https://huggingface.co/sentence-transformers/paraphrase-multilingual-mpnet-base-v2) model with a labeled dataset of webpage titles and descriptions.
- [`inference.ipynb`](https://github.com/targeted-and-troublesome/targeted-and-troublesome-crawler/blob/main/classifier/inference.ipynb): Demonstrates classification with the fine-tuned model.
- [`data`](https://github.com/targeted-and-troublesome/targeted-and-troublesome-crawler/tree/main/classifier/data): Contains the dataset for fine-tuning.

## Prerequisites

The model was fine-tuned on Ubuntu 22.04 LTS with Python 3.10.12 but can run on other platforms. The required Python libraries are listed below and they can be installed with
`pip install -r requirements.txt`:

- `torch`
- `transformers`
- `datasets`
- `sklearn`
- `numpy`
- `sentence-transformers`


## Disclaimer
⚠️ We strongly recommend against using this model in high-stakes decision-making and classification.
Consult the [§6.3 Limitations](https://arxiv.org/pdf/2308.04887#page=13) for potential biases and shortcomings.
