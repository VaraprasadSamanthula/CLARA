/**
 * Persistent banner indicating synthetic data (not real patient records).
 */

export function SyntheticDataBanner() {
  return (
    <div className="synthetic-banner">
      ⚠️ <strong>Synthetic demo data — not for clinical use.</strong> This application is a research prototype and should not be used for clinical decision-making.
    </div>
  );
}
