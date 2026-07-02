FROM python:3.14-slim

RUN useradd --create-home fintrack
USER fintrack

WORKDIR /home/fintrack/app

COPY --chown=fintrack:fintrack requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

COPY --chown=fintrack:fintrack . .

ENV PATH="/home/fintrack/.local/bin:${PATH}"

EXPOSE 8000

CMD ["bash", "start.sh"]
