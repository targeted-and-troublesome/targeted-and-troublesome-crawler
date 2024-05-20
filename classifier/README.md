# Multilingual Text Classifier for Children's Websites

![Screenshot 2024-05-20 at 14 22 16](https://github.com/targeted-and-troublesome/targeted-and-troublesome-crawler/assets/44579458/aafff9f0-51ae-44d4-b4b3-cceb13e97347)


This README provides resources for fine-tuning and evaluating a multilingual classifier to identify children's websites using their titles and descriptions.

- [`fine-tuning.ipynb`](https://github.com/targeted-and-troublesome/targeted-and-troublesome-crawler/blob/main/classifier/fine-tuning.ipynb): Demonstrates fine-tuning the [`sentence-transformers/paraphrase-multilingual-mpnet-base-v2`](https://huggingface.co/sentence-transformers/paraphrase-multilingual-mpnet-base-v2) model with a labeled dataset of webpage titles and descriptions.
- [`inference.ipynb`](https://github.com/targeted-and-troublesome/targeted-and-troublesome-crawler/blob/main/classifier/inference.ipynb): Demonstrates classification with the fine-tuned model.
- [`data`](https://github.com/targeted-and-troublesome/targeted-and-troublesome-crawler/tree/main/classifier/data): Contains the dataset for fine-tuning.


A high-level overview of the classification pipeline is shown in the figure above.
We use the classifier's confidence scores to efficiently prioritize websites for manual review, rather than relying on binary classification.
For more details, please refer to [§3. Building a list of child-directed websites](https://arxiv.org/pdf/2308.04887#page=4) in the paper.


## Prerequisites
For fine-tuning you may need a GPU. For inference, a CPU suffices.
The model was fine-tuned on Ubuntu 22.04 LTS with Python 3.10.12.

The required Python packages are listed below. They can be installed with
`pip install -r requirements.txt`.

- `torch`
- `transformers`
- `datasets`
- `scikit-learn`
- `numpy`
- `sentence-transformers`

**Disclaimer:**
⚠️ We strongly recommend against using this model in high-stakes decision-making and classification.
Consult the [§6.3 Limitations](https://arxiv.org/pdf/2308.04887#page=13) for a non-exhaustive list of potential biases and shortcomings.

