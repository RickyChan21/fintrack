FROM python:3.14-slim

# Create a non-privileged user
RUN useradd --create-home fintrack
USER fintrack

WORKDIR /home/fintrack/app

COPY --chown=fintrack:fintrack requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

COPY --chown=fintrack:fintrack . .

# Add local bin to path (for pip installed packages)
ENV PATH="/home/fintrack/.local/bin:${PATH}"

CMD ["python", "worker.py"]
