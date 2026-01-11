/**
 * useVoiceTransformKeyboard Hook
 *
 * Listens for Ctrl+Shift+T (or Cmd+Shift+T on Mac) keyboard shortcut.
 * When triggered:
 * 1. Detects if a text input/textarea is focused
 * 2. Extracts the text value
 * 3. Calls the provided callback with the text
 *
 * @example
 * ```tsx
 * useVoiceTransformKeyboard({
 *   onTrigger: (text) => {
 *     setInputText(text);
 *     setIsPopoverOpen(true);
 *   },
 *   enabled: true,
 * });
 * ```
 */

import { useEffect } from 'react';

interface UseVoiceTransformKeyboardOptions {
  /**
   * Callback when shortcut is triggered
   * @param text - The text from the focused input element
   */
  readonly onTrigger: (text: string) => void;

  /**
   * Whether the keyboard listener is enabled
   * @default true
   */
  readonly enabled?: boolean;
}

/**
 * Check if an element is a text input element
 */
function isTextInputElement(
  element: Element | null
): element is HTMLInputElement | HTMLTextAreaElement | HTMLElement {
  if (!element) {
    return false;
  }

  if (element.tagName === 'TEXTAREA') {
    return true;
  }

  if (element.tagName === 'INPUT') {
    const inputElement = element as HTMLInputElement;
    const textInputTypes = [
      'text',
      'email',
      'password',
      'search',
      'tel',
      'url',
      'number',
    ];
    return textInputTypes.includes(inputElement.type);
  }

  // Check for contenteditable
  if (element.getAttribute('contenteditable') === 'true') {
    return true;
  }

  return false;
}

/**
 * Extract text value from an input element
 */
function getTextValue(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLElement
): string {
  // HTMLInputElement and HTMLTextAreaElement have 'value' property
  if ('value' in element && typeof element.value === 'string') {
    return element.value;
  }

  // For contenteditable elements
  return element.textContent ?? '';
}

export function useVoiceTransformKeyboard({
  onTrigger,
  enabled = true,
}: UseVoiceTransformKeyboardOptions): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      // Check for Ctrl+Shift+T (or Cmd+Shift+T on Mac)
      const isModifierPressed = event.metaKey || event.ctrlKey;
      const isShiftPressed = event.shiftKey;
      const isKeyT = event.key.toLowerCase() === 't';

      if (!isModifierPressed || !isShiftPressed || !isKeyT) {
        return;
      }

      // Get the currently focused element
      const focusedElement = document.activeElement;

      if (!isTextInputElement(focusedElement)) {
        return;
      }

      // Prevent default browser behavior (new tab)
      event.preventDefault();

      // Extract text and trigger callback
      const text = getTextValue(focusedElement);
      onTrigger(text);
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onTrigger, enabled]);
}
