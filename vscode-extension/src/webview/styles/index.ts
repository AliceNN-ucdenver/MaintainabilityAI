import { themeStyles } from './theme';
import { componentStyles } from './components';

export { themeStyles, componentStyles };

/** Combined theme variables + shared component CSS. */
export function getSharedStyles(): string {
  return themeStyles + '\n' + componentStyles;
}
