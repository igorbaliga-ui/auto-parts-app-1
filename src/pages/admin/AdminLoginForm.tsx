import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import PageBackground from '@/components/site/PageBackground';

type AdminLoginFormProps = {
  password: string;
  setPassword: (value: string) => void;
  error: string;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
};

const AdminLoginForm = ({ password, setPassword, error, loading, onSubmit }: AdminLoginFormProps) => (
  <PageBackground>
    <div className="min-h-screen flex items-center justify-center px-5">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-[360px] bg-card border border-steel rounded-sm p-8 flex flex-col gap-4"
      >
        <h1 className="font-head uppercase tracking-wide text-xl text-center">
          Заявки — вход
        </h1>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Пароль"
          autoFocus
        />
        {error && <p className="text-primary text-sm text-center">{error}</p>}
        <Button type="submit" disabled={loading} className="font-head uppercase tracking-wide h-11">
          {loading ? 'Входим…' : 'Войти'}
        </Button>
      </form>
    </div>
  </PageBackground>
);

export default AdminLoginForm;
