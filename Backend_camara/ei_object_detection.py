# ei_object_detection.py - CORREGIDO PARA GRAYSCALE
# Edge Impulse - OpenMV FOMO Object Detection con escala de grises

import sensor, image, time, ml, math, uos, gc

# Intentar resetear el sensor. Si falla, imprimimos una pista de depuración
# y mantenemos el dispositivo en un bucle de espera para que puedas leer
# la salida de la consola desde OpenMV IDE sin que la placa se reinicie.
try:
    sensor.reset()
except Exception as e:
    print("✗ Error: no se detectó el sensor de imagen. ¿El módulo de cámara está conectado?")
    print("Detalles:", e)
    # Mantener la placa en un bucle de espera para depuración (no re-lanzar excepción)
    while True:
        time.sleep_ms(1000)

# Configuración del sensor - ESCALA DE GRISES
sensor.set_pixformat(sensor.GRAYSCALE)    # *** CAMBIADO A GRAYSCALE ***
sensor.set_framesize(sensor.QVGA)         # 320x240
sensor.set_windowing((240, 240))          # Ventana 240x240
sensor.skip_frames(time=2000)             # Esperar estabilización

net = None
labels = None
min_confidence = 0.5

# Cargar el modelo entrenado
try:
    net = ml.Model("trained.tflite", load_to_fb=uos.stat('trained.tflite')[6] > (gc.mem_free() - (64*1024)))
    print("✓ Modelo cargado exitosamente")
except Exception as e:
    raise Exception('Failed to load "trained.tflite", did you copy the .tflite and labels.txt file onto the mass-storage device? (' + str(e) + ')')

# Cargar etiquetas
try:
    labels = [line.rstrip('\n') for line in open("labels.txt")]
    print("✓ Etiquetas cargadas:", labels)
except Exception as e:
    raise Exception('Failed to load "labels.txt", did you copy the .tflite and labels.txt file onto the mass-storage device? (' + str(e) + ')')

# Colores para visualización (aunque estemos en grayscale, se pueden usar para dibujar)
colors = [
    (255,   0,   0),  # Rojo
    (  0, 255,   0),  # Verde
    (255, 255,   0),  # Amarillo
    (  0,   0, 255),  # Azul
    (255,   0, 255),  # Magenta
    (  0, 255, 255),  # Cyan
    (255, 255, 255),  # Blanco
]

threshold_list = [(math.ceil(min_confidence * 255), 255)]

def fomo_post_process(model, inputs, outputs):
    """Procesar las salidas del modelo FOMO"""
    ob, oh, ow, oc = model.output_shape[0]

    x_scale = inputs[0].roi[2] / ow
    y_scale = inputs[0].roi[3] / oh

    scale = min(x_scale, y_scale)

    x_offset = ((inputs[0].roi[2] - (ow * scale)) / 2) + inputs[0].roi[0]
    y_offset = ((inputs[0].roi[3] - (ow * scale)) / 2) + inputs[0].roi[1]

    l = [[] for i in range(oc)]

    for i in range(oc):
        img = image.Image(outputs[0][0, :, :, i] * 255)
        blobs = img.find_blobs(
            threshold_list, x_stride=1, y_stride=1, area_threshold=1, pixels_threshold=1
        )
        for b in blobs:
            rect = b.rect()
            x, y, w, h = rect
            score = (
                img.get_statistics(thresholds=threshold_list, roi=rect).l_mean() / 255.0
            )
            x = int((x * scale) + x_offset)
            y = int((y * scale) + y_offset)
            w = int(w * scale)
            h = int(h * scale)
            l[i].append((x, y, w, h, score))
    return l

print("✓ Sistema iniciado - Esperando detecciones...")
print("✓ Modo: GRAYSCALE")
print("=" * 50)

clock = time.clock()

while(True):
    clock.tick()

    # Capturar imagen en escala de grises
    img = sensor.snapshot()

    # Realizar predicción
    detections_found = False
    
    for i, detection_list in enumerate(net.predict([img], callback=fomo_post_process)):
        if i == 0: continue  # Saltar clase background
        if len(detection_list) == 0: continue  # No hay detecciones para esta clase
        
        detections_found = True
        print("********** %s **********" % labels[i])
        
        for x, y, w, h, score in detection_list:
            center_x = math.floor(x + (w / 2))
            center_y = math.floor(y + (h / 2))
            
            # Imprimir detección
            print(f"x {center_x}\ty {center_y}\tscore {score:.3f}")
            
            # Dibujar círculo en la detección (visible incluso en grayscale)
            img.draw_circle((center_x, center_y, 12), color=colors[i], thickness=2)
            
            # Dibujar etiqueta
            img.draw_string(center_x - 20, center_y - 30, labels[i], color=colors[i])

    # Mostrar FPS
    fps = clock.fps()
    print(f"FPS: {fps:.2f}")
    
    if not detections_found:
        print("[Sin detecciones]")
    
    print("")  # Línea en blanco para separar frames
    
    # Pequeña pausa para evitar sobrecarga
    time.sleep_ms(1000) # 1 segundos entre capturas