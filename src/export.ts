import { state } from '@/state';
import { showToast } from '@/ui';

/**
 * Renders #palmares-export-wrapper to a high-resolution PNG image and triggers download
 */
export async function exportGraphicHD(): Promise<void> {
  const wrapper = document.getElementById('palmares-export-wrapper');
  if (!wrapper) return;

  showToast('Generazione immagine HD in corso...', 'info');

  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }

  let exportBg = '#090d16';
  if (state.currentTheme === 'gala') exportBg = '#090d16';
  if (state.currentTheme === 'seriea') exportBg = '#020b1c';
  if (state.currentTheme === 'gazzetta') exportBg = '#fce7ec';
  if (state.currentTheme === 'studio') exportBg = '#f1f5f9';

  const prevScrollX = window.scrollX;
  const prevScrollY = window.scrollY;
  window.scrollTo(0, 0);

  try {
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(wrapper, {
      scale: 2.2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: exportBg,
      logging: false,
      scrollX: 0,
      scrollY: 0,
      windowWidth: Math.max(document.documentElement.scrollWidth, 1380)
    });

    const link = document.createElement('a');
    link.download = `Palmares_Fantacalcio_${new Date().getFullYear()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('Grafica HD scaricata con successo!', 'success');
  } catch (err) {
    console.error(err);
    showToast("Errore durante l'esportazione.", 'error');
  } finally {
    window.scrollTo(prevScrollX, prevScrollY);
  }
}
