import { useNavigate } from 'react-router-dom';
import { UtensilsCrossed, CreditCard, Settings, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-lg">
            <UtensilsCrossed className="text-primary-foreground h-10 w-10" />
          </div>
          <h1 className="text-3xl font-bold">RestoManager</h1>
          <p className="text-muted-foreground mt-2">Система управления рестораном</p>
        </div>

        {/* Login options */}
        <div className="space-y-4">
          <Card 
            className="cursor-pointer hover:border-primary transition-all hover:shadow-md group"
            onClick={() => navigate('/pin')}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-green-500" />
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </CardHeader>
            <CardContent>
              <CardTitle className="text-lg">Войти как кассир</CardTitle>
              <CardDescription className="mt-1">
                Вход по PIN-коду для работы с кассой
              </CardDescription>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:border-primary transition-all hover:shadow-md group"
            onClick={() => navigate('/auth')}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Settings className="h-6 w-6 text-blue-500" />
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </CardHeader>
            <CardContent>
              <CardTitle className="text-lg">Войти как менеджер</CardTitle>
              <CardDescription className="mt-1">
                Вход по email для управления рестораном
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          © 2026 RestoManager. Все права защищены.
        </p>
      </div>
    </div>
  );
}
