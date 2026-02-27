FROM python:3.11-slim

RUN pip install --no-cache-dir anthropic requests PyGithub

COPY main.py /main.py
COPY analyzer.py /analyzer.py
COPY github_commenter.py /github_commenter.py
COPY prompts/ /prompts/

ENTRYPOINT ["python", "/main.py"]
