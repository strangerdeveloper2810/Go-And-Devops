import { Icon } from '../../atoms/Icon';
import { Dropzone } from '../../molecules/Dropzone';

// Bọc molecule Dropzone cho module file — icon plus + copy sẵn, trạng thái/click do container điều khiển.
export const UploadZone = ({ active, onClick }: { active?: boolean; onClick?: () => void }) => (
  <Dropzone
    icon={<Icon name="plus" size={22} />}
    title="Kéo thả file"
    hint="hoặc bấm để chọn"
    active={active}
    onClick={onClick}
  />
);
