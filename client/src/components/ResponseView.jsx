export default function ResponseView({ state }) {
  if (!state) return null;

  const { loading, error, result } = state;

  if (loading) {
    return <div className="response response--loading">Request in progress...</div>;
  }

  if (error) {
    return (
      <div className="response response--error">
        <strong>Error:</strong> {error}
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className={`response ${result.ok ? "response--ok" : "response--error"}`}>
      <div className="response__status">HTTP {result.status}</div>
      <pre>{typeof result.data === "string" ? result.data : JSON.stringify(result.data, null, 2)}</pre>
    </div>
  );
}
