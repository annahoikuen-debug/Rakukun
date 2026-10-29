import { Document, Page, Text, View, StyleSheet, renderToBuffer, Font } from "@react-pdf/renderer";
import path from "path";
import type { ReportData } from "./report-aggregator";

// Register a CJK font so Japanese text renders (Helvetica has no CJK glyphs).
// No Bold face exists in the repo, so map the bold weight to the same file —
// otherwise react-pdf falls back to Helvetica-Bold and CJK glyphs render as tofu.
Font.register({
  family: "NotoSansJP",
  src: path.join(process.cwd(), "public", "fonts", "NotoSansJP-Regular.otf"),
  fontWeight: "normal",
});
Font.register({
  family: "NotoSansJP",
  src: path.join(process.cwd(), "public", "fonts", "NotoSansJP-Regular.otf"),
  fontWeight: "bold",
});

const styles = StyleSheet.create({
  page: { padding: 40, paddingBottom: 56, fontSize: 11, fontFamily: "NotoSansJP" },
  title: { fontSize: 18, textAlign: "center", marginBottom: 16, fontWeight: "bold" },
  section: { marginBottom: 12 },
  h2: { fontSize: 13, marginBottom: 6, fontWeight: "bold" },
  row: { flexDirection: "row", borderBottom: "1px solid #ccc", paddingVertical: 4 },
  cell: { flex: 1, fontSize: 10 },
  th: { flex: 1, fontSize: 10, fontWeight: "bold" },
  barWrap: { height: 10, backgroundColor: "#eee", marginTop: 2, marginBottom: 8 },
  bar: { height: 10, backgroundColor: "#4f46e5" },
  comment: { fontSize: 10, lineHeight: 1.5, marginTop: 8 },
  pageNum: { position: "absolute", bottom: 20, left: 0, right: 0, textAlign: "center", fontSize: 9 },
});

export function ReportDocument({ data }: { data: ReportData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text
          fixed
          style={styles.pageNum}
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
        />
        <Text style={styles.title}>標的型攻撃メール訓練 実施報告書</Text>
        <View style={styles.section}>
          <Text>実施企業名: {data.tenantName}</Text>
          <Text>実施期間: {data.periodStart ?? "-"} 〜 {data.periodEnd ?? "-"}</Text>
          <Text>使用シナリオ: {data.templateKey}</Text>
          <Text>訓練名: {data.campaignTitle} (ID: {data.campaignId})</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>② サマリー</Text>
          <View style={styles.row}>
            <Text style={styles.th}>対象者数</Text>
            <Text style={styles.th}>クリック数</Text>
            <Text style={styles.th}>クリック率</Text>
            <Text style={styles.th}>クイズ完了数</Text>
            <Text style={styles.th}>クイズ完了率</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.cell}>{data.overall.sent}</Text>
            <Text style={styles.cell}>{data.overall.clicked}</Text>
            <Text style={styles.cell}>{data.overall.clickRate}%</Text>
            <Text style={styles.cell}>{data.overall.quizCompleted}</Text>
            <Text style={styles.cell}>{data.overall.quizCompletionRate}%</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>③ 部署別クリック率</Text>
          <View style={styles.row}>
            <Text style={styles.th}>部署</Text>
            <Text style={styles.th}>対象</Text>
            <Text style={styles.th}>クリック</Text>
            <Text style={styles.th}>クリック率</Text>
            <Text style={styles.th}>クイズ完了率</Text>
          </View>
          {data.departments.map((d, i) => (
            <View key={i}>
              <View style={styles.row}>
                <Text style={styles.cell}>{d.department}</Text>
                <Text style={styles.cell}>{d.sent}</Text>
                <Text style={styles.cell}>{d.clicked}</Text>
                <Text style={styles.cell}>{d.clickRate}%</Text>
                <Text style={styles.cell}>{d.quizCompletionRate}%</Text>
              </View>
              <View style={styles.barWrap}>
                <View style={[styles.bar, { width: `${Math.min(d.clickRate, 100)}%` }]} />
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>④ 訓練対象者・受講結果一覧</Text>
          <View style={styles.row}>
            <Text style={[styles.th, { flex: 2 }]}>氏名</Text>
            <Text style={styles.th}>部署</Text>
            <Text style={[styles.th, { flex: 2 }]}>メール</Text>
            <Text style={styles.th}>開収(クリック)</Text>
            <Text style={styles.th}>教育完了</Text>
          </View>
          <View wrap>
            {data.employees.map((e, i) => (
              <View key={i} style={styles.row}>
                <Text style={[styles.cell, { flex: 2 }]}>{e.name}</Text>
                <Text style={styles.cell}>{e.department}</Text>
                <Text style={[styles.cell, { flex: 2 }]}>{e.email}</Text>
                <Text style={styles.cell}>{e.isHumanClicked ? "有" : "無"}</Text>
                <Text style={styles.cell}>{e.quizCompletedAt ? e.quizCompletedAt.slice(0, 10) : "-"}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section} wrap>
          <Text style={styles.h2}>⑤ 総評・改善計画</Text>
          <Text style={styles.comment}>{data.reviewComment || data.autoComment}</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function renderReportPdf(data: ReportData): Promise<Buffer> {
  return renderToBuffer(<ReportDocument data={data} />);
}