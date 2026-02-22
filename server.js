const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

// ========== ТВОЙ КЛЮЧ PROXYAPI (OpenRouter) ==========
const PROXYAPI_KEY = 'sk-2gCqWGQConyKtFaTS79BvokizJQ9iOm4';
// Новый адрес для OpenRouter (см. https://proxyapi.ru/openrouter)
const PROXYAPI_URL = 'https://openrouter.api.proxyapi.ru/v1/chat/completions';

app.use(cors());
app.use(express.json());

// ========== ЗАГЛУШКА ДЛЯ FAVICON ==========
app.get('/favicon.ico', (req, res) => res.status(204).end());

// ========== ОСНОВНОЙ ЭНДПОИНТ ==========
app.post('/api/move', async (req, res) => {
    try {
        const { fen, history, difficulty, turn } = req.body;

        // Проверка, что данные пришли
        if (!fen || !history || difficulty === undefined || !turn) {
            return res.status(400).json({ success: false, error: 'Неполные данные' });
        }

        const systemPrompt = getSystemPrompt(difficulty);
        const userPrompt = `Сыграй ход в шахматах. Ты играешь ${turn === 'w' ? 'белыми' : 'чёрными'}.
Текущая позиция (FEN): ${fen}.
История ходов: ${history.join(' ')}.
Сделай ход. ${difficulty === 3 ? 'Можешь добавить короткий комментарий после хода через дефис.' : 'Отвечай ТОЛЬКО ходом (например, "e4" или "Nf3"), без лишних слов.'}`;

        // Используем актуальную модель DeepSeek через OpenRouter
        const response = await axios.post(PROXYAPI_URL, {
            model: 'deepseek/deepseek-chat-v3.1', // Можно заменить на :free для бесплатной версии
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: getTemperature(difficulty),
            max_tokens: 60
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${PROXYAPI_KEY}`
                // Заголовки HTTP-Referer и X-Title убраны, чтобы избежать ошибок с символами.
                // При желании можно добавить, используя только латиницу:
                // 'HTTP-Referer': 'https://github.com/gapi17646-ops/chess-bratan',
                // 'X-Title': 'Chess Bratan'
            }
        });

        // Проверка структуры ответа от OpenRouter
        if (!response.data || !response.data.choices || !response.data.choices[0]) {
            throw new Error('Некорректный ответ от API');
        }

        res.json({
            success: true,
            move: response.data.choices[0].message.content
        });

    } catch (error) {
        console.error('Ошибка при обращении к ProxyAPI:', error.response?.data || error.message);
        // Возвращаем понятную ошибку клиенту
        res.status(500).json({
            success: false,
            error: error.response?.data?.error?.message || 'Ошибка сервера при обращении к API'
        });
    }
});

// Вспомогательные функции (без изменений)
function getSystemPrompt(level) {
    const prompts = {
        1: 'Ты полный лапоть в шахматах. Делай случайные, часто глупые ходы. Зевай фигуры. Игрок должен легко выигрывать. Отвечай только ходом.',
        2: 'Ты новичок. Старайся играть, но иногда делай ошибки: не замечай простые угрозы. Отвечай только ходом.',
        3: 'Ты любитель. Играй в свою силу, старайся делать нормальные ходы. Иногда можешь поддаться ради красоты. Можешь добавлять короткий комментарий через дефис.',
        4: 'Ты сильный шахматист. Играй серьёзно, делай лучшие ходы. Почти не ошибайся. Отвечай только ходом.',
        5: 'Ты гроссмейстер. Играй максимально сильно, используй глубокие стратегии. Не прощай ошибок. Отвечай только ходом.'
    };
    return prompts[level] || prompts[3];
}

function getTemperature(level) {
    const temps = { 1: 1.8, 2: 1.2, 3: 0.8, 4: 0.4, 5: 0.2 };
    return temps[level] || 0.8;
}

app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
});
