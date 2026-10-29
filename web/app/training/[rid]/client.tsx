"use client";
import { useEffect, useRef, useState } from "react";

const QUIZ = [
  {
    q: "このメールのどこが不審でしたか？",
    choices: ["送信元アドレスのドメイン", "件名の長さ", "署名の有無"],
    answer: 0,
  },
  {
    q: "不審なリンクをクリックする前に確認すべきことは？",
    choices: ["リンク先のURLドメイン", "メールの色", "送信時刻"],
    answer: 0,
  },
  {
    q: "訓練メールと本物のフィッシングの違いは？",
    choices: ["訓練は学習目的", "本物は学習目的", "違いはない"],
    answer: 0,
  },
];

export default function TrainingLanding({ rid }: { rid: string }) {
  const trackedRef = useRef(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  // Single synchronous gate so scroll/mousemove/click can never double-fire.
  function track() {
    if (trackedRef.current) return;
    trackedRef.current = true;
    fetch("/api/training/track-human-click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rid }),
    }).catch(() => {});
  }

  useEffect(() => {
    window.addEventListener("scroll", track, { once: true });
    window.addEventListener("mousemove", track, { once: true });
    return () => {
      window.removeEventListener("scroll", track);
      window.removeEventListener("mousemove", track);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rid]);

  function answerChoice(i: number) {
    if (selected !== null) return;
    setSelected(i);
    const correct = i === QUIZ[quizIndex].answer;
    if (correct) setScore((s) => s + 1);
    setTimeout(() => {
      setSelected(null);
      if (quizIndex + 1 < QUIZ.length) {
        setQuizIndex((q) => q + 1);
      } else {
        // all answered
        if (score + (correct ? 1 : 0) === QUIZ.length) {
          fetch("/api/training/complete-quiz", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rid }),
          }).catch(() => {});
        }
        setDone(true);
      }
    }, 800);
  }

  const allCorrect = score === QUIZ.length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 p-4 rounded">
          <strong>⚠️ これは社内の情報セキュリティ訓練です</strong>
          <p className="text-sm mt-1">安心してください。これは実際の攻撃ではなく、セキュリティ意識向上のための訓練メールです。あなたの個人情報は収集されていません。</p>
        </div>

        <h1 className="text-2xl font-bold">このメールのどこが不審だった？</h1>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded shadow">
            <h3 className="font-semibold mb-2">1. 送信元アドレス</h3>
            <p className="text-sm">ドメインが本物のサービスと微妙に異なっていました。送信元を必ず確認しましょう。</p>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <h3 className="font-semibold mb-2">2. URLのドメイン</h3>
            <p className="text-sm">リンク先のドメインが公式と異なります。ホバーしてURLを確認しましょう。</p>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <h3 className="font-semibold mb-2">3. 緊急性を煽る文面</h3>
            <p className="text-sm">「今すぐ」「24時間以内」など焦らせる文面はフィッシングの典型的な手口です。</p>
          </div>
        </div>

        <button onClick={track} className="bg-black text-white px-4 py-2 rounded">
          内容を確認する
        </button>

        {!done && (
          <div className="bg-white p-4 rounded shadow">
            <p className="font-semibold mb-2">{QUIZ[quizIndex].q}</p>
            <div className="space-y-2">
              {QUIZ[quizIndex].choices.map((c, i) => (
                <button
                  key={i}
                  onClick={() => answerChoice(i)}
                  disabled={selected !== null}
                  className={`w-full text-left p-2 border rounded ${selected === i ? (i === QUIZ[quizIndex].answer ? "bg-green-100" : "bg-red-100") : ""}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {done && (
          <div className="bg-white p-4 rounded shadow">
            <p className="font-semibold">クイズ結果: {score}/{QUIZ.length}</p>
            {allCorrect ? (
              <p className="text-green-700">全問正解！フォローアップ教育完了です。</p>
            ) : (
              <p className="text-red-700">不正解がありました。再度確認しましょう。</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}