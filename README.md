# CLI Reference

## Hotak AI

```bash
# Backend (FastAPI)
conda activate hotak-ai-venv
uvicorn app.server:app --reload

# Frontend (React)
cd frontend
npm run dev

# Access
# Frontend: http://localhost:5173
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

## Conda

```bash
# Create environment
conda create -p ./venv

# Create environment with packages
conda create -p ./venv numpy pandas

# Activate / Deactivate
conda activate ./venv
conda deactivate

# Install packages
conda install matplotlib numpy pandas
conda install -p ./venv package-name

# List environments / packages
conda env list
conda list

# Remove environment
conda remove -p ./venv --all
```

### From environment.yaml

Create `environment.yaml`:

```yaml
name: test-env
channels:
  - conda-forge
dependencies:
  - python>=3.5
  - numpy
  - pandas
  - pip
  - pip:
    - -r file:requirements.txt
```

Then create environment:

```bash
conda env create -f environment.yaml
```

### Export Environments

```bash
# Save environment
conda export --format=environment-yaml --file=environment.yaml

# Or traditional
conda env export > environment.yml
```

## Ollama

```bash
# Container
docker start ollama
docker stop ollama
docker ps | grep ollama

# Models
docker exec -it ollama ollama pull llama2
docker exec -it ollama ollama list
docker exec -it ollama ollama rm llama2

# Run
docker exec -it ollama ollama run llama2
docker exec -it ollama ollama run llama2 "Your question"

# Logs / Shell
docker logs ollama
docker exec -it ollama /bin/bash
```

## Python + Ollama

```bash
# Install
conda install ollama
```

```python
import ollama

# Generate
response = ollama.generate(model='llama2', prompt='Your question')
print(response['response'])

# Chat
messages = [{'role': 'user', 'content': 'Hello!'}]
response = ollama.chat(model='llama2', messages=messages)
print(response['message']['content'])
```
