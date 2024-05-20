## Fine-tuning a multilingual text classifier to identify children's websites

This repository contains resources and notebooks for building and evaluating a multilingual classifier to identify children's websites based on their titles and descriptions in various languages.

We fine-tune the  [`sentence-transformers/paraphrase-multilingual-mpnet-base-v2`](https://huggingface.co/sentence-transformers/paraphrase-multilingual-mpnet-base-v2) model using a dataset containing webpage titles and descriptions.


## Contents

- `fine-tuning.ipynb`: Jupyter notebook demonstrating the process of fine-tuning a multilingual text classifier using [`sentence-transformers`](https://sbert.net/).
- `inference.ipynb`: Jupyter notebook demonstrating classification  using the fine-tuned model.
- `data/`: Directory containing the dataset used for fine-tuning the model.
- `model/`: Directory containing the fine-tuned model artifacts and files required for inference such as fine-tuned model weights and tokenizer files. Provide the path to this directory when configuring the inference notebook to ensure the model and tokenizer are correctly loaded. You can either fine-tune the model yourself, or download the fine-tuned model [here]().
- `requirements.txt`: File containing the required Python libraries to run the notebooks.

## Prerequisites

The model is fine-tuned on Ubuntu 22.04 LTS, with Python 3.10.12, but it should be possible to run our code on other platforms and Python versions. Make sure you have the following Python libraries installed:

- `torch`
- `transformers`
- `datasets`
- `sklearn`
- `numpy`
- `sentence-transformers`
