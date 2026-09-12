FROM python:3.12-alpine
WORKDIR /app
COPY app.py ./
COPY static ./static
RUN mkdir /app/data
ENV HOST=0.0.0.0 PORT=8765 DATA_DIR=/app/data
EXPOSE 8765
CMD ["python", "app.py"]
