import PageContainer from '../components/ui/PageContainer';
import FooterLinks from '../components/common/FooterLinks';
import Navbar from '../components/common/Navbar';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import { useTheme } from '../theme/useTheme';
import { useI18n } from '../i18n/useI18n';
import { useAuth } from '../contexts/AuthContext';
import Alert from '../components/ui/Alert';
import React from 'react';
import EditableNickname from '../components/profile/EditableNickname';
import { useUploadPhoto } from '../hooks/useUploadPhoto';
import GameHistoryCard from '../components/profile/GameHistoryCard';

export default function MySpacePage() {
  const { theme } = useTheme();
  const { messages } = useI18n();
  const { user } = useAuth();
  const { uploadPhoto, isProcessing, errorMsg, setErrorMsg } = useUploadPhoto();

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  if (!user) {
    return (
      <PageContainer header={<Navbar />} footer={<FooterLinks />}>
        <div style={{ textAlign: 'center', padding: '50px', color: theme.colors.text }}>
          Loading...
        </div>
      </PageContainer>
    );
  }

  const gatewayDomain = window.location.origin.replace(':5173', ':8000');

// 백엔드가 준 주소가 도메인이 없는 상대 경로('/api/...') 형식이면 앞에 도메인을 결합해 줍니다.
  const currentAvatarUrl = user.userPhoto?.startsWith('/')
    ? `${gatewayDomain}${user.userPhoto}`
    : user.userPhoto;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadPhoto(file);
      e.target.value = '';
    }
  };

  const pageTitle = messages.mySpace?.title && user.nickname
    ? messages.mySpace.title.replace('{userId}', user.nickname) 
    : "My Space";

  return (
    <PageContainer header={<Navbar />} footer={<FooterLinks />}>
      <Alert 
        open={!!errorMsg} 
        title={pageTitle} 
        message={errorMsg || ''} 
        confirmText={messages.result?.false || "OK"} 
        onClose={() => setErrorMsg(null)} 
      />
      <div style={{
        width: '100%',
        maxWidth: '900px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}>
        <h1 style={{ margin: 0, fontSize: '32px', color: theme.colors.text, textAlign: 'center' }}>
          {pageTitle}
        </h1>

        {/* 프로필 카드 - 아바타 + 닉네임 */}
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '16px 0' }}>
            <Avatar size={120} url={currentAvatarUrl}/>
            <Button onClick={() => fileInputRef.current?.click()} disabled={isProcessing} style={{ fontSize: '14px', padding: '10px 20px' }}>
              {isProcessing ? messages.mySpace.submitting : messages.mySpace.editAvatar}
            </Button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept="image/*" />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <EditableNickname currentNickname={user?.nickname || ''} />
              <span style={{ fontSize: '20px', fontWeight: 'bold', color: theme.colors.text }}>
                {user?.loginId}
              </span>
            </div>
          </div>
        </Card>
        <GameHistoryCard user={user} />
      </div>
    </PageContainer>
  );
}