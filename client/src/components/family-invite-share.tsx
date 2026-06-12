import { useState } from 'react';
import QRCode from 'react-qr-code';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { buildFamilyInviteUrl } from '@/lib/family-invite';
import { Check, Copy, Link2 } from 'lucide-react';

interface FamilyInviteShareProps {
  familyCode: string;
}

export function FamilyInviteShare({ familyCode }: FamilyInviteShareProps) {
  const { toast } = useToast();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const inviteUrl = buildFamilyInviteUrl(familyCode);

  const copyText = async (text: string, kind: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      if (kind === 'code') {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      } else {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
    } catch {
      toast({
        title: 'Fout',
        description: 'Kon niet kopiëren naar klembord.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-700">Familie Code</label>
        <div className="flex items-center space-x-2 mt-1">
          <Input
            value={familyCode}
            readOnly
            className="font-mono text-center tracking-wider"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => copyText(familyCode, 'code')}
            className="flex-shrink-0"
            aria-label="Kopieer familiecode"
          >
            {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700">Uitnodigingslink</label>
        <div className="flex items-center space-x-2 mt-1">
          <Input value={inviteUrl} readOnly className="text-xs" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => copyText(inviteUrl, 'link')}
            className="flex-shrink-0"
            aria-label="Kopieer uitnodigingslink"
          >
            {copiedLink ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Deel de link of QR-code — de familiecode wordt automatisch ingevuld
        </p>
      </div>

      <div className="flex flex-col items-center rounded-lg border bg-white p-4">
        <QRCode value={inviteUrl} size={160} />
        <p className="text-xs text-gray-500 mt-3 text-center">Scan om direct te joinen</p>
      </div>
    </div>
  );
}
