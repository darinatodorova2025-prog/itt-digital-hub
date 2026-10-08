export default function AdminLoading() {
  return (
    <div className="admin-loading" role="status" aria-live="polite">
      <span className="admin-loading-mark" aria-hidden="true" />
      <span>Зареждане</span>
    </div>
  );
}
