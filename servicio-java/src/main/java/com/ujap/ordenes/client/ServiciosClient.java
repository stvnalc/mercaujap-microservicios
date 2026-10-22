package com.ujap.ordenes.client;

import com.ujap.ordenes.exception.ErrorNegocio;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * COMUNICACION ENTRE MICROSERVICIOS.
 * Este servicio (Java) hace peticiones HTTP a:
 *   - servicio-python  (http://servicio-python:8000/usuarios/{id})        para validar el cliente
 *   - servicio-node    (http://servicio-node:3000/productos/{id})         para precio y stock
 *   - servicio-node    (PATCH /productos/{id}/stock)                      para descontar / devolver stock
 * Dentro de Docker los servicios se encuentran por su nombre (DNS de la red "backend").
 */
@Component
public class ServiciosClient {

    public record UsuarioDto(Long id, String nombre, String email, String documento, String direccion,
                             String rol, Boolean activo) {}

    public record ProductoDto(String _id, String sku, String nombre, BigDecimal precio, Integer stock, Boolean activo) {}

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
            throw new ErrorNegocio(HttpStatus.BAD_REQUEST, "El cliente seleccionado no existe");
        } catch (ResourceAccessException e) {
            throw new ErrorNegocio(HttpStatus.SERVICE_UNAVAILABLE, "El servicio de clientes no responde. Intenta de nuevo");
        }
    }

    public ProductoDto obtenerProducto(String id) {
        try {
            return productos.get().uri("/productos/{id}", id).retrieve().body(ProductoDto.class);
        } catch (HttpClientErrorException.NotFound | HttpClientErrorException.BadRequest e) {
            throw new ErrorNegocio(HttpStatus.BAD_REQUEST, "Uno de los productos del pedido ya no existe en el catálogo");
        } catch (ResourceAccessException e) {
            throw new ErrorNegocio(HttpStatus.SERVICE_UNAVAILABLE, "El servicio de productos no responde. Intenta de nuevo");
        }
    }

    /** cantidad negativa = descontar stock, positiva = devolver stock. Queda registrado como movimiento en Node. */
    public void ajustarStock(String productoId, int cantidad, String motivo, String referencia, String usuario, Instant fecha) {
        Map<String, Object> cuerpo = new HashMap<>();
        if (fecha != null) cuerpo.put("fecha", fecha.toString());
        cuerpo.put("cantidad", cantidad);
        cuerpo.put("motivo", motivo);
        cuerpo.put("referencia", referencia);
        try {
            productos.patch()
                    .uri("/productos/{id}/stock", productoId)
                    .header("X-Usuario-Nombre", URLEncoder.encode(usuario == null ? "Sistema" : usuario, StandardCharsets.UTF_8).replace("+", "%20"))
                    .body(cuerpo)
                    .retrieve()
                    .toBodilessEntity();
        } catch (HttpClientErrorException.Conflict e) {
            throw new ErrorNegocio(HttpStatus.CONFLICT, "Stock insuficiente: otro pedido tomó las últimas unidades");
        } catch (HttpClientErrorException.NotFound e) {
            throw new ErrorNegocio(HttpStatus.BAD_REQUEST, "Uno de los productos del pedido ya no existe en el catálogo");
        } catch (ResourceAccessException e) {
            throw new ErrorNegocio(HttpStatus.SERVICE_UNAVAILABLE, "El servicio de productos no responde. Intenta de nuevo");
        }
    }

    // ---- Usados solo para cargar los datos de demostracion ----

    public List<UsuarioDto> listarClientesActivos() {
        return usuarios.get().uri("/usuarios?tipo=clientes&activo=true").retrieve()
                .body(new ParameterizedTypeReference<List<UsuarioDto>>() {});
    }

    public List<ProductoDto> listarProductosActivos() {
        return productos.get().uri("/productos?activo=true").retrieve()
                .body(new ParameterizedTypeReference<List<ProductoDto>>() {});
    }
}
