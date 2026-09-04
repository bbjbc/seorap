/** 빈 상태 삽화: 겹쳐진 세 장의 카드 */
export const EmptyArt = ({ small = false }: { small?: boolean }) => (
  <div className={`empty-art${small ? ' small' : ''}`}>
    <i className="ea a" />
    <i className="ea b" />
    <i className="ea c" />
  </div>
);
