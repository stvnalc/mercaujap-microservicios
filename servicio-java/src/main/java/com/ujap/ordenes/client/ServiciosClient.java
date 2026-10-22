package com.ujap.ordenes.client;

import com.ujap.ordenes.exception.ErrorNegocio;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.Map;

/**
 * COMUNICACION ENTRE MICROSERVICIOS.
 * Este servicio (Java) hace peticiones HTTP a:
 *   - servicio-python  (http://servicio-python:8000/usuarios/{id})  para validar el usuario
 *   - servicio-node    (http://servicio-node:3000/productos/{id})   para precio y stock
 * Dentro de Docker los servicios se encuentran por su nombre (DNS de la red "backend").
 */
@Component
public class ServiciosClient {

    public record UsuarioDto(Long id, String nombre, String email) {}

    public record ProductoDto(String _id, String nombre, BigDecimal precio, Integer stock) {}

    private final RestClient usuarios;
    private final RestClient productos;

    public ServiciosClient(@Value("${servicios.usuarios.url}") String usuariosUrl,
                           @Value("${servicios.productos.url}") String productosUrl) {
        // HTTP/1.1 explicito y timeouts cortos: si otro servicio esta caido, fallamos rapido
        HttpClient http = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(Duration.ofSeconds(3))
                .build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(http);
        factory.setReadTimeout(Duration.ofSeconds(5));

        this.usuarios = RestClient.builder().requestFactory(factory).baseUrl(usuariosUrl).build();
        this.productos = RestClient.builder().requestFactory(factory).baseUrl(productosUrl).build();
    }

    public UsuarioDto obtenerUsuario(Long id) {
        try {
            return usuarios.get().uri("/usuarios/{id}", id).retrieve().body(UsuarioDto.class);
        } catch (HttpClientErrorException.NotFound e) {
            throw new ErrorNegocio(HttpStatus.BAD_REQUEST, "El usuario " + id + " no existe (servicio Python)");
        } catch (ResourceAccessException e) {
            throw new ErrorNegocio(HttpStatus.SERVICE_UNAVAILABLE, "El servicio de usuarios (Python) no responde");
        }
    }

    public ProductoDto obtenerProducto(String id) {
        try {
            return productos.get().uri("/productos/{id}", id).retrieve().body(ProductoDto.class);
        } catch (HttpClientErrorException.NotFound | HttpClientErrorException.BadRequest e) {
            throw new ErrorNegocio(HttpStatus.BAD_REQUEST, "El producto " + id + " no existe (servicio Node)");
        } catch (ResourceAccessException e) {
            throw new ErrorNegocio(HttpStatus.SERVICE_UNAVAILABLE, "El servicio de productos (Node) no responde");
        }
    }

    /** cantidad negativa = descontar stock, positiva = devolver stock. */
    public void ajustarStock(String productoId, int cantidad) {
        try {
            productos.patch()
                    .uri("/productos/{id}/stock", productoId)
                    .body(Map.of("cantidad", cantidad))
                    .retrieve()
                    .toBodilessEntity();
        } catch (HttpClientErrorException.Conflict e) {
            throw new ErrorNegocio(HttpStatus.CONFLICT, "Stock insuficiente para el producto " + productoId);
        } catch (HttpClientErrorException.NotFound e) {
            throw new ErrorNegocio(HttpStatus.BAD_REQUEST, "El producto " + productoId + " no existe (servicio Node)");
        } catch (ResourceAccessException e) {
            throw new ErrorNegocio(HttpStatus.SERVICE_UNAVAILABLE, "El servicio de productos (Node) no responde");
        }
    }
}
