FROM python:3.7

WORKDIR /usr/src/app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY tgfinance2022 ./tgfinance2022
COPY resources ./resources

CMD [ "-m", "tgfinance2022.webserver" ]
ENTRYPOINT ["python"]