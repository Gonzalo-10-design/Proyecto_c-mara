# openmv_debug.py - script para depuración de sensor OpenMV
# Ejecuta este script desde OpenMV IDE (no desde Python en PC)

import sensor, time

print("OpenMV Debug script starting...")

try:
    sensor.reset()
    print("OK: sensor.reset()")
    # Try default configuration
    sensor.set_pixformat(sensor.RGB565)
    sensor.set_framesize(sensor.QVGA)
    sensor.skip_frames(time=2000)
    print("OK: sensor configured")

    # Enter capture loop to confirm sensor produces frames
    while True:
        img = sensor.snapshot()
        print("Captured frame")
        # Sleep a bit so we can read the console
        time.sleep_ms(500)

except Exception as e:
    print("✗ Error: sensor detection failed or sensor hardware is detached")
    print("Details:", e)
    print("Keep this message visible (manual reset required to break the loop).")
    while True:
        time.sleep_ms(1000)
