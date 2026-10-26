import { Fade, Menu } from "@mui/material";
import * as React from "react";

// Flat dropdown (homelab-look): border and radius come from the theme's MuiMenu override
const PopupMenu = (props) => {
  const horizontal = props.horizontal ?? "left";
  return (
    <Menu
      anchorEl={props.anchorEl}
      open={props.open}
      onClose={props.onClose}
      onClick={props.onClose}
      slots={{ transition: Fade }}
      slotProps={{
        paper: {
          elevation: 0,
          sx: {
            mt: 0.5,
            minWidth: 200,
            "& .MuiAvatar-root": {
              width: 32,
              height: 32,
              ml: -0.5,
              mr: 1,
            },
          },
        },
      }}
      transformOrigin={{ horizontal, vertical: "top" }}
      anchorOrigin={{ horizontal, vertical: "bottom" }}
    >
      {props.children}
    </Menu>
  );
};

export default PopupMenu;
