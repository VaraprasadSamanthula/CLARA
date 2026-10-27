/**
 * Disclaimer component for clinical summaries.
 */

interface DisclaimerProps {
  text?: string;
}

export function Disclaimer({ text }: DisclaimerProps) {
  return (
    <div className="disclaimer">
      {text || (
        <>
          <strong>⚠️ Informational Support Only</strong>
          This summary is generated from clinical records for informational support purposes only.
          It does not constitute clinical advice, diagnosis, or treatment recommendations.
          Clinical decisions should be made by qualified healthcare professionals.
        </>
      )}
    </div>
  );
}
