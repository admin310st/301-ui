/**
 * Управление видимостью utility-bar при прокрутке
 * - Скрывается при прокрутке вниз
 * - Показывается при прокрутке вверх
 * - Всегда видима в верхней части страницы
 */

export function initUtilityBarScroll(): void {
  const utilityBar = document.querySelector<HTMLElement>('.utility-bar');
  if (!utilityBar) return;

  let lastScrollTop = 0;
  const scrollDelta = 5; // Минимальная дельта прокрутки для срабатывания
  let isAtTop = true;

  function checkIfAtTop(): boolean {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    // Считаем что мы "вверху", если прокрутили меньше высоты utility-bar
    const threshold = utilityBar.offsetHeight;
    isAtTop = scrollTop <= threshold;
    return isAtTop;
  }

  function hideUtilityBar(): void {
    if (isAtTop) return; // Не скрываем если мы вверху
    utilityBar.style.transition = 'transform 0.3s ease';
    utilityBar.style.transform = 'translateY(-100%)';
  }

  function showUtilityBar(): void {
    utilityBar.style.transition = 'transform 0.3s ease';
    utilityBar.style.transform = 'translateY(0)';
  }

  // Обработчик прокрутки
  window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;

    // Игнорируем минимальные изменения
    if (Math.abs(lastScrollTop - scrollTop) <= scrollDelta) return;

    checkIfAtTop();

    if (isAtTop) {
      // Всегда показываем вверху страницы
      showUtilityBar();
    } else if (scrollTop > lastScrollTop) {
      // Прокрутка вниз - скрываем
      hideUtilityBar();
    } else {
      // Прокрутка вверх - показываем
      showUtilityBar();
    }

    lastScrollTop = scrollTop;
  });

  // Показываем при загрузке, если мы вверху
  window.addEventListener('load', () => {
    if (checkIfAtTop()) {
      showUtilityBar();
    }
  });
}
