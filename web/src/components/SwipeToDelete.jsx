import * as React from "react";
import { useRef, useState } from "react";
import { Box } from "@mui/material";
import { Trash2 } from "lucide-react";

const LOCK_DISTANCE = 8; // px of movement before deciding between horizontal swipe and vertical scroll
const DELETE_RATIO = 0.35; // fraction of the card width that must be swiped to delete on release

/**
 * iOS-style swipe-left-to-delete wrapper. Touch/pen only; mouse users keep the ⋮ menu.
 * touch-action: pan-y leaves vertical scrolling to the browser, so we only see horizontal drags.
 */
const SwipeToDelete = ({ onDelete, label, children }) => {
  const ref = useRef(null);
  const start = useRef(null);
  const direction = useRef(null); // "h" | "v" | null
  const swiped = useRef(false);
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);

  const handlePointerDown = (ev) => {
    if (ev.pointerType === "mouse") {
      return;
    }
    start.current = { x: ev.clientX, y: ev.clientY };
    direction.current = null;
    swiped.current = false;
  };

  const handlePointerMove = (ev) => {
    if (!start.current) {
      return;
    }
    const moveX = ev.clientX - start.current.x;
    const moveY = ev.clientY - start.current.y;
    if (direction.current === null) {
      if (Math.abs(moveX) > LOCK_DISTANCE && Math.abs(moveX) > Math.abs(moveY)) {
        direction.current = "h";
        swiped.current = true;
        setDragging(true);
        try {
          ev.currentTarget.setPointerCapture(ev.pointerId);
        } catch (e) {
          // Pointer already released; the swipe still works without capture
        }
      } else if (Math.abs(moveY) > LOCK_DISTANCE) {
        direction.current = "v";
        start.current = null;
        return;
      }
    }
    if (direction.current === "h") {
      setDx(Math.min(0, moveX));
    }
  };

  const handlePointerEnd = () => {
    if (!start.current) {
      return;
    }
    start.current = null;
    setDragging(false);
    if (direction.current !== "h") {
      return;
    }
    const width = ref.current?.offsetWidth || 1;
    if (-dx > width * DELETE_RATIO) {
      setDx(-width);
      setTimeout(onDelete, 180); // let the slide-out animation finish
    } else {
      setDx(0);
    }
  };

  // Swallow the click that follows a swipe, so it doesn't open links or buttons in the card
  const handleClickCapture = (ev) => {
    if (swiped.current) {
      ev.stopPropagation();
      ev.preventDefault();
      swiped.current = false;
    }
  };

  const progress = Math.min(1, -dx / 80);

  return (
    <Box sx={{ position: "relative", borderRadius: "16px", overflow: "hidden" }}>
      {dx < 0 && (
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 1,
            pr: 3,
            color: "#fff",
            fontWeight: 600,
            fontSize: 15,
            backgroundColor: "error.main",
            opacity: 0.4 + 0.6 * progress,
          }}
        >
          <Trash2 size={20} />
          {label}
        </Box>
      )}
      <Box
        ref={ref}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onClickCapture={handleClickCapture}
        sx={{
          position: "relative",
          touchAction: "pan-y",
          transform: `translateX(${dx}px)`,
          transition: dragging ? "none" : "transform 0.18s ease-out",
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default SwipeToDelete;
