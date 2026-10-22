# --- Etapa 1: compilar el binario de Go ---
FROM golang:1.25-alpine AS build
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY *.go ./
# CGO_ENABLED=0 => binario estatico que corre en cualquier Linux
RUN CGO_ENABLED=0 go build -o servicio-go .

# --- Etapa 2: imagen minima solo con el binario ---
FROM alpine:3.20
WORKDIR /app
COPY --from=build /app/servicio-go .
EXPOSE 8080
CMD ["./servicio-go"]
