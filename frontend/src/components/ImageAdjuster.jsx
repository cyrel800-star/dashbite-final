import { useEffect, useRef, useState } from "react";

const OUTPUT_WIDTH = 1000;

export default function ImageAdjuster({ src, aspect, title, onCancel, onSave, onError }) {
  const canvasRef = useRef(null);
  const dragRef = useRef(null);
  const [image, setImage] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const width = OUTPUT_WIDTH;
  const height = Math.round(width / aspect);

  useEffect(() => {
    setImage(null);
    const selected = new Image();
    selected.onload = () => setImage(selected);
    selected.onerror = () => onError("The selected image could not be opened.");
    selected.src = src;
    return () => {
      selected.onload = null;
      selected.onerror = null;
    };
  }, [src, onError]);

  useEffect(() => {
    if (!image) return;
    const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight) * zoom;
    const maxX = (image.naturalWidth * scale - width) / 2;
    const maxY = (image.naturalHeight * scale - height) / 2;
    setOffset((current) => {
      const x = Math.max(-maxX, Math.min(maxX, current.x));
      const y = Math.max(-maxY, Math.min(maxY, current.y));
      return x === current.x && y === current.y ? current : { x, y };
    });
  }, [height, image, width, zoom]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || !image) return;

    const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight) * zoom;
    const imageWidth = image.naturalWidth * scale;
    const imageHeight = image.naturalHeight * scale;
    context.clearRect(0, 0, width, height);
    context.fillStyle = "#242424";
    context.fillRect(0, 0, width, height);
    context.drawImage(
      image,
      (width - imageWidth) / 2 + offset.x,
      (height - imageHeight) / 2 + offset.y,
      imageWidth,
      imageHeight,
    );
  }, [height, image, offset, width, zoom]);

  const moveImage = (event) => {
    if (!dragRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const bounds = canvas.getBoundingClientRect();
    const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight) * zoom;
    const maxX = (image.naturalWidth * scale - width) / 2;
    const maxY = (image.naturalHeight * scale - height) / 2;
    const ratio = width / bounds.width;
    const x = dragRef.current.offset.x + (event.clientX - dragRef.current.pointer.x) * ratio;
    const y = dragRef.current.offset.y + (event.clientY - dragRef.current.pointer.y) * ratio;
    setOffset({
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    });
  };

  const startMoving = (event) => {
    if (!image) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointer: { x: event.clientX, y: event.clientY },
      offset,
    };
  };

  const stopMoving = () => {
    dragRef.current = null;
  };

  const save = () => {
    try {
      onSave(canvasRef.current.toDataURL("image/jpeg", 0.84));
    } catch {
      onError("Your browser could not process this image. Try another image.");
    }
  };

  return (
    <div className="modal-backdrop image-adjuster-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
      <section className="card image-adjuster" role="dialog" aria-modal="true" aria-labelledby="image-adjuster-title">
        <div className="row">
          <h3 id="image-adjuster-title">Adjust {title}</h3>
          <button type="button" className="ib" onClick={onCancel} aria-label="Cancel image adjustment">×</button>
        </div>
        <p>Drag the image to reposition it, or use the slider to zoom.</p>
        <canvas
          ref={canvasRef}
          className="image-adjuster-canvas"
          width={width}
          height={height}
          onPointerDown={startMoving}
          onPointerMove={moveImage}
          onPointerUp={stopMoving}
          onPointerCancel={stopMoving}
          role="img"
          aria-label={`${title} crop preview`}
        />
        <label className="image-zoom">Zoom
          <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />
        </label>
        <div className="row">
          <button type="button" className="btn gh" onClick={onCancel}>Cancel</button>
          <button type="button" className="btn" onClick={save} disabled={!image}>Use Image</button>
        </div>
      </section>
    </div>
  );
}
