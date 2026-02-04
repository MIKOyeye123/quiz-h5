import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface AuthProps {
  onAuthSuccess: () => void;
}

export const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isLogin) {
        // 登录
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (signInError) throw signInError;

        onAuthSuccess();
      } else {
        // 注册
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password
        });

        if (signUpError) throw signUpError;

        setMessage('注册成功！请检查邮箱验证链接（如果启用了邮箱验证）。');
        // 注册后自动登录
        setTimeout(() => {
          onAuthSuccess();
        }, 1000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { error: magicLinkError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin
        }
      });

      if (magicLinkError) throw magicLinkError;

      setMessage('已发送 Magic Link 到您的邮箱，请查收邮件并点击链接登录。');
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: 400,
        margin: '0 auto',
        padding: '40px 20px',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div
        style={{
          width: '100%',
          backgroundColor: '#ffffff',
          borderRadius: 12,
          padding: '32px 24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8, textAlign: 'center' }}>
          {isLogin ? '登录' : '注册'}
        </h1>
        <p style={{ fontSize: 14, color: '#666', marginBottom: 24, textAlign: 'center' }}>
          {isLogin ? '登录以开始刷题' : '创建新账户'}
        </p>

        {error && (
          <div
            style={{
              padding: '12px',
              marginBottom: 16,
              borderRadius: 6,
              backgroundColor: '#fff1f0',
              border: '1px solid #ffccc7',
              color: '#cf1322',
              fontSize: 14
            }}
          >
            {error}
          </div>
        )}

        {message && (
          <div
            style={{
              padding: '12px',
              marginBottom: 16,
              borderRadius: 6,
              backgroundColor: '#f6ffed',
              border: '1px solid #b7eb8f',
              color: '#52c41a',
              fontSize: 14
            }}
          >
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: 'block',
                fontSize: 14,
                fontWeight: 500,
                marginBottom: 6,
                color: '#333'
              }}
            >
              邮箱
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 6,
                border: '1px solid #d9d9d9',
                fontSize: 14,
                boxSizing: 'border-box'
              }}
              placeholder="your@email.com"
            />
          </div>

          {isLogin && (
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 14,
                  fontWeight: 500,
                  marginBottom: 6,
                  color: '#333'
                }}
              >
                密码
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 6,
                  border: '1px solid #d9d9d9',
                  fontSize: 14,
                  boxSizing: 'border-box'
                }}
                placeholder="••••••••"
              />
            </div>
          )}

          {!isLogin && (
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 14,
                  fontWeight: 500,
                  marginBottom: 6,
                  color: '#333'
                }}
              >
                密码（至少6位）
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 6,
                  border: '1px solid #d9d9d9',
                  fontSize: 14,
                  boxSizing: 'border-box'
                }}
                placeholder="••••••••"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              marginBottom: 12,
              borderRadius: 6,
              border: 'none',
              fontSize: 16,
              fontWeight: 500,
              color: '#ffffff',
              backgroundColor: loading ? '#d9d9d9' : '#1677ff',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? '处理中...' : isLogin ? '登录' : '注册'}
          </button>

          {isLogin && (
            <button
              type="button"
              onClick={handleMagicLink}
              disabled={loading || !email}
              style={{
                width: '100%',
                padding: '12px',
                marginBottom: 12,
                borderRadius: 6,
                border: '1px solid #1677ff',
                fontSize: 14,
                fontWeight: 500,
                color: '#1677ff',
                backgroundColor: '#ffffff',
                cursor: loading || !email ? 'not-allowed' : 'pointer'
              }}
            >
              发送 Magic Link
            </button>
          )}
        </form>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
              setMessage(null);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#1677ff',
              fontSize: 14,
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            {isLogin ? '还没有账户？注册' : '已有账户？登录'}
          </button>
        </div>
      </div>
    </div>
  );
};

