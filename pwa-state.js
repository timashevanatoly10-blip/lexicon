/* Update-only adapter. Drafts stay in this tab's sessionStorage, never in SW caches. */
(() => {
  const key = 'lexicon:pwa-update-draft:v1';
  const knownInputs = new Set(['wordInput', 'textInput']);
  const changed = new Set();
  let pending = 0;
  const fetchOriginal = window.fetch.bind(window);
  // Observe completion only: requests, response bodies and errors pass through unchanged.
  window.fetch = (...args) => {
    pending += 1;
    return fetchOriginal(...args).then(response => {
      response.clone().arrayBuffer().catch(() => {}).finally(() => { pending -= 1; });
      return response;
    }, error => { pending -= 1; throw error; });
  };
  document.addEventListener('input', event => changed.add(event.target), true);
  document.addEventListener('change', event => changed.add(event.target), true);
  window.LexiconUpdateState = {
    prepare() {
      if (pending || textAudioIsRecording || textAudioIsProcessing || vettingBusy || inboxBusy ||
          [...document.querySelectorAll('audio, video')].some(el => !el.paused) ||
          document.querySelector('#wordTranslateBtn:disabled, #textTranslateBtn:disabled')) {
        throw new Error('Дождитесь завершения текущей операции или записи. Затем нажмите Update.');
      }
      if ([...document.querySelectorAll('input[type="file"]')].some(el => el.files?.length)) {
        throw new Error('Завершите работу с выбранным файлом перед обновлением.');
      }
      if (currentDocumentId || currentDocumentKey || vettingLastCardPayload) {
        throw new Error('Сохраните результаты работы с документом или ИИ перед обновлением; при необходимости откройте приложение заново после сохранения.');
      }
      // Unknown editors, modal forms and volatile AI/file workflows must be saved first.
      if ([...changed].some(el => !knownInputs.has(el.id) && el.isConnected &&
          (el.value || el.textContent || el.type === 'checkbox'))) {
        throw new Error('Сохраните или закройте редактируемые данные перед обновлением.');
      }
      if (document.querySelector('[role="dialog"], [id$="Overlay"], [contenteditable="true"]')) {
        throw new Error('Сохраните изменения и закройте окно редактирования перед обновлением.');
      }
      const activePage = document.querySelector('.page.active')?.id;
      if (activePage && activePage !== 'homePage') {
        throw new Error('Сохраните текущую работу и вернитесь на главный экран перед обновлением.');
      }
      const snapshot = {
        schema: 1, savedAt: Date.now(), url: location.href,
        word: document.getElementById('wordInput')?.value || '',
        text: document.getElementById('textInput')?.value ?? textSourceValue,
        textSourceValue, textTranslatedValue, textTranslationReady,
        textReadingHtml, textReadingRawValue, textActivePanel,
        currentWordTranslationCard, wordLeftPanelHtml, wordRightPanelHtml,
        wordLeftPanelPayload, wordRightPanelPayload, wordActivePanel,
        currentWordPartIndex, wordExamplesExpanded, lastWordTranslateSource,
        textCopiedPanels, textCopiedSignature, wordCopiedValue,
        wordResultText: currentWordTranslationCard ? null : document.getElementById('wordResultOutput')?.textContent,
        mode: document.getElementById('textModeBtn')?.classList.contains('active') ? 'text' : 'word'
      };
      const serialized = JSON.stringify(snapshot);
      sessionStorage.setItem(key, serialized);
      if (sessionStorage.getItem(key) !== serialized) throw new Error('Не удалось сохранить черновик. Обновление отменено.');
    },
    cancel() { sessionStorage.removeItem(key); },
    restore() {
      const serialized = sessionStorage.getItem(key);
      if (!serialized) return;
      const draft = JSON.parse(serialized);
      if (draft.schema !== 1 || draft.url !== location.href) return;
      // Retain the snapshot on failure so it can be recovered after retrying.
      const word = document.getElementById('wordInput');
      if (word) word.value = draft.word;
      const text = document.getElementById('textInput');
      if (text) text.value = draft.text;
      textSourceValue = draft.textSourceValue;
      textTranslatedValue = draft.textTranslatedValue;
      textTranslationReady = draft.textTranslationReady;
      textReadingHtml = draft.textReadingHtml;
      textReadingRawValue = draft.textReadingRawValue;
      textActivePanel = draft.textActivePanel;
      currentWordTranslationCard = draft.currentWordTranslationCard;
      wordLeftPanelHtml = draft.wordLeftPanelHtml;
      wordRightPanelHtml = draft.wordRightPanelHtml;
      wordLeftPanelPayload = draft.wordLeftPanelPayload;
      wordRightPanelPayload = draft.wordRightPanelPayload;
      wordActivePanel = draft.wordActivePanel;
      currentWordPartIndex = draft.currentWordPartIndex;
      wordExamplesExpanded = draft.wordExamplesExpanded;
      lastWordTranslateSource = draft.lastWordTranslateSource;
      textCopiedPanels = draft.textCopiedPanels || [];
      textCopiedSignature = draft.textCopiedSignature || '';
      wordCopiedValue = draft.wordCopiedValue || '';
      if (textTranslationReady) {
        renderClickableTextPanels(textSourceValue, textTranslatedValue);
        document.getElementById('textPanelTabs')?.classList.remove('hidden');
        switchTextPanel(textActivePanel);
      }
      if (currentWordTranslationCard) renderStructuredWordCard(currentWordTranslationCard, currentWordPartIndex);
      else if (draft.wordResultText) setWordResult(draft.wordResultText);
      setMode(draft.mode);
      updateTextInlineClearVisibility();
      updateTextCopyFeedback();
      updateWordCopyFeedback();
      sessionStorage.removeItem(key);
    }
  };
})();
