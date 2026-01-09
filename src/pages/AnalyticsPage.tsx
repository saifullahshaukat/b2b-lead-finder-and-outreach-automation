import { TopBar } from '@/components/layout/TopBar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { mockAnalytics } from '@/data/mockData';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Funnel,
  FunnelChart,
  LabelList,
} from 'recharts';
import { Send, Eye, MousePointer, MessageSquare, TrendingUp, Users } from 'lucide-react';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function AnalyticsPage() {
  const { outreachStats, channelPerformance, leadsBySource, funnel } = mockAnalytics;

  const openRate = ((outreachStats.opened / outreachStats.delivered) * 100).toFixed(1);
  const clickRate = ((outreachStats.clicked / outreachStats.opened) * 100).toFixed(1);
  const replyRate = ((outreachStats.replied / outreachStats.sent) * 100).toFixed(1);

  return (
    <>
      <TopBar title="Analytics" subtitle="Performance metrics and insights" />

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Send className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{outreachStats.sent.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Messages Sent</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Eye className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{openRate}%</p>
                  <p className="text-sm text-muted-foreground">Open Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <MousePointer className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{clickRate}%</p>
                  <p className="text-sm text-muted-foreground">Click Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{replyRate}%</p>
                  <p className="text-sm text-muted-foreground">Reply Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Channel Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Channel Performance</CardTitle>
              <CardDescription>Compare performance across channels</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={channelPerformance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="channel" 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                    />
                    <YAxis 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="sent" fill="hsl(var(--primary))" name="Sent" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="opened" fill="hsl(var(--chart-2))" name="Opened" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="replied" fill="hsl(var(--chart-3))" name="Replied" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Leads by Source */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Leads by Source</CardTitle>
              <CardDescription>Where your leads come from</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center">
                <ResponsiveContainer width="50%" height="100%">
                  <PieChart>
                    <Pie
                      data={leadsBySource}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      dataKey="count"
                      nameKey="source"
                    >
                      {leadsBySource.map((entry, index) => (
                        <Cell key={entry.source} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {leadsBySource.map((item, index) => (
                    <div key={item.source} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-sm">{item.source}</span>
                      </div>
                      <span className="text-sm font-medium">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Conversion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conversion Funnel</CardTitle>
            <CardDescription>Lead progression through stages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4">
              {funnel.map((stage, index) => (
                <div key={stage.stage} className="flex-1 text-center">
                  <div
                    className="mx-auto mb-2 rounded-lg flex items-center justify-center text-2xl font-bold"
                    style={{
                      width: `${100 - index * 15}%`,
                      height: 60,
                      backgroundColor: `hsl(var(--primary) / ${1 - index * 0.15})`,
                      color: 'hsl(var(--primary-foreground))',
                    }}
                  >
                    {stage.count}
                  </div>
                  <p className="text-sm text-muted-foreground">{stage.stage}</p>
                  {index > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {((stage.count / funnel[index - 1].count) * 100).toFixed(0)}%
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Channel Breakdown Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detailed Channel Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 font-medium">Channel</th>
                    <th className="text-right py-3 font-medium">Sent</th>
                    <th className="text-right py-3 font-medium">Opened</th>
                    <th className="text-right py-3 font-medium">Open Rate</th>
                    <th className="text-right py-3 font-medium">Replied</th>
                    <th className="text-right py-3 font-medium">Reply Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {channelPerformance.map(channel => (
                    <tr key={channel.channel} className="border-b border-border/50">
                      <td className="py-3 font-medium">{channel.channel}</td>
                      <td className="text-right py-3">{channel.sent.toLocaleString()}</td>
                      <td className="text-right py-3">{channel.opened.toLocaleString()}</td>
                      <td className="text-right py-3">
                        <Badge variant="secondary">
                          {((channel.opened / channel.sent) * 100).toFixed(1)}%
                        </Badge>
                      </td>
                      <td className="text-right py-3">{channel.replied.toLocaleString()}</td>
                      <td className="text-right py-3">
                        <Badge 
                          variant="secondary"
                          className={
                            (channel.replied / channel.sent) * 100 > 10
                              ? 'bg-green-500/10 text-green-400'
                              : ''
                          }
                        >
                          {((channel.replied / channel.sent) * 100).toFixed(1)}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
