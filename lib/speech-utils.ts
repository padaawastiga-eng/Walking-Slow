/**
 * Text-to-Speech (TTS) Voice Guidance for Jalan Santai Navigation
 */

class SpeechService {
  private synth: SpeechSynthesis | null = null;
  private voice: SpeechSynthesisVoice | null = null;
  private isEnabled: boolean = true;
  private lastSpokenText: string = '';
  private lastSpokenTime: number = 0;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.initVoice();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.initVoice();
      }
    }
  }

  private initVoice() {
    if (!this.synth) return;
    const voices = this.synth.getVoices();
    // Prefer Indonesian voice
    const indonesianVoice = voices.find(
      (v) => v.lang.includes('id') || v.lang.includes('ID') || v.name.toLowerCase().includes('indonesia')
    );
    this.voice = indonesianVoice || voices.find((v) => v.lang.startsWith('en')) || voices[0] || null;
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (!enabled && this.synth) {
      this.synth.cancel();
    }
  }

  public speak(text: string, force: boolean = false) {
    if (!this.isEnabled || !this.synth) return;

    // Prevent spamming identical announcements within 6 seconds unless forced
    const now = Date.now();
    if (!force && text === this.lastSpokenText && now - this.lastSpokenTime < 6000) {
      return;
    }

    try {
      this.synth.cancel(); // Stop current speech to announce urgent guidance
      const utterance = new SpeechSynthesisUtterance(text);
      if (this.voice) {
        utterance.voice = this.voice;
      }
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.lang = this.voice?.lang || 'id-ID';

      this.lastSpokenText = text;
      this.lastSpokenTime = now;

      this.synth.speak(utterance);
    } catch (e) {
      console.warn('SpeechSynthesis error:', e);
    }
  }

  public announceNavigationStart() {
    this.speak('Navigasi Jalan Santai dimulai. Tetap ikuti petunjuk arah di layar HP Anda.', true);
  }

  public announceTargetWaypoint(waypointName: string, distanceMeters: number) {
    const text = `Menuju ${waypointName}. Jarak sekitar ${Math.round(distanceMeters)} meter.`;
    this.speak(text);
  }

  public announceWaypointNear(waypointName: string) {
    this.speak(`${waypointName} sudah dekat! Bersiaplah.`, true);
  }

  public announceWaypointCompleted(completedName: string, nextName: string) {
    this.speak(`${completedName} selesai! Lanjut menuju ${nextName}.`, true);
  }

  public announceOffRoute() {
    this.speak('Peringatan! Anda keluar dari jalur rute jalan santai. Harap kembali ke jalur.', true);
  }

  public announceOnRoute() {
    this.speak('Anda sudah kembali ke jalur rute.', true);
  }

  public announceFinish() {
    this.speak('Selamat! Anda telah SUDAH SAMPAI di Garis Finish secara lengkap dan sah!', true);
  }

  public announceSudahSampaiFinish() {
    this.speak('Pemberitahuan! Anda SUDAH SAMPAI di Garis Finish. Aplikasi dan pelacakan GPS dihentikan secara otomatis.', true);
  }

  public announceIncompleteFinish(pendingPosNames: string[]) {
    const list = pendingPosNames.join(', ');
    this.speak(
      `Peringatan! Anda berada di garis finish, tetapi Anda belum melewati pos ${list}. Silakan lanjutkan rute jalan santai.`,
      true
    );
  }
}

export const speechService = new SpeechService();
