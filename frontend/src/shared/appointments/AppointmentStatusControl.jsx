import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

const STATUSES = ["confirmed", "cancelled"];

export function AppointmentStatusControl({ appointmentId, label, status, disabled = false, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState(null);
  const pickerRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const currentStatus = status === "pending" ? "confirmed" : status;
  const menuId = `appointment-status-menu-${appointmentId}`;

  useLayoutEffect(() => {
    if (!isOpen) return undefined;
    const positionMenu = () => {
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      if (!trigger || !menu) return;
      const triggerRect = trigger.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
      const width = Math.min(Math.max(triggerRect.width, menuRect.width), viewportWidth - 16);
      const left = Math.min(Math.max(triggerRect.left, 8), viewportWidth - width - 8);
      const below = triggerRect.bottom + 6;
      const top = below + menuRect.height <= window.innerHeight - 8
        ? below
        : Math.max(8, triggerRect.top - menuRect.height - 6);
      setMenuPosition({ top, left, width });
    };
    positionMenu();
    window.addEventListener("resize", positionMenu);
    window.addEventListener("scroll", positionMenu, true);
    return () => {
      window.removeEventListener("resize", positionMenu);
      window.removeEventListener("scroll", positionMenu, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!pickerRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  if (currentStatus === "completed") {
    return <span className="ht-status-badge ht-status-badge-completed ht-appointment-status-pill">Completed</span>;
  }

  const currentLabel = currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1);
  const orderedStatuses = [currentStatus, ...STATUSES.filter((nextStatus) => nextStatus !== currentStatus)];

  return (
    <div
      className="ht-appointment-status-picker"
      ref={pickerRef}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Update status for ${label}`}
        aria-expanded={isOpen}
        aria-controls={menuId}
        className={`ht-appointment-status-trigger ht-appointment-status-trigger-${currentStatus}`}
        disabled={disabled}
        onClick={() => setIsOpen((open) => !open)}
      >
        {currentLabel}
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {isOpen && createPortal(
        <div
          id={menuId}
          ref={menuRef}
          className="ht-appointment-status-menu"
          role="group"
          aria-label={`Status choices for ${label}`}
          style={{
            top: menuPosition?.top ?? 0,
            left: menuPosition?.left ?? 0,
            minWidth: menuPosition ? `${menuPosition.width}px` : undefined,
            visibility: menuPosition ? "visible" : "hidden",
          }}
        >
          {orderedStatuses.map((nextStatus) => (
            <button
              key={nextStatus}
              type="button"
              className={`ht-appointment-status-option ht-appointment-status-option-${nextStatus}`}
              aria-pressed={currentStatus === nextStatus}
              disabled={disabled || currentStatus === nextStatus}
              onClick={() => {
                setIsOpen(false);
                onChange(nextStatus);
              }}
            >
              {nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}